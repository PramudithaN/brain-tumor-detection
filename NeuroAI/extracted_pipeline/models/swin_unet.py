# --------------------------------------------------------
# Swin-Unet implementation for SimMIM codebase
# --------------------------------------------------------

import torch
import torch.nn as nn
import torch.utils.checkpoint as checkpoint
from timm.models.layers import to_2tuple, trunc_normal_

from .swin_transformer import SwinTransformerBlock, PatchMerging, BasicLayer, PatchEmbed

class PatchExpand(nn.Module):
    def __init__(self, input_resolution, dim, dim_scale=2, norm_layer=nn.LayerNorm):
        super().__init__()
        self.input_resolution = input_resolution
        self.dim = dim
        self.dim_scale = dim_scale
        self.expand = nn.Linear(dim, dim_scale * dim, bias=False)
        self.norm = norm_layer(dim // dim_scale)

    def forward(self, x):
        """
        x: B, H*W, C
        """
        H, W = self.input_resolution
        B, L, C = x.shape
        assert L == H * W, "input feature has wrong size"
        
        x = self.expand(x) # B, L, dim_scale*C
        
        p = self.dim_scale
        C_out = C // p
        
        x = x.view(B, H, W, p * p * C_out)
        x = x.view(B, H, W, p, p, C_out)
        x = x.permute(0, 1, 3, 2, 4, 5).contiguous() # shape: B, H, p, W, p, C_out
        x = x.view(B, H * p, W * p, C_out)
        x = x.view(B, -1, C_out)
        
        x = self.norm(x)
        return x

class BasicLayerUp(nn.Module):
    """ A basic Swin Transformer layer for one stage of the decoder. """
    def __init__(self, dim, input_resolution, depth, num_heads, window_size,
                 mlp_ratio=4., qkv_bias=True, qk_scale=None, drop=0., attn_drop=0.,
                 drop_path=0., norm_layer=nn.LayerNorm, upsample=None, use_checkpoint=False):
        super().__init__()
        self.dim = dim
        self.input_resolution = input_resolution
        self.depth = depth
        self.use_checkpoint = use_checkpoint

        # build blocks
        self.blocks = nn.ModuleList([
            SwinTransformerBlock(dim=dim, input_resolution=input_resolution,
                                 num_heads=num_heads, window_size=window_size,
                                 shift_size=0 if (i % 2 == 0) else window_size // 2,
                                 mlp_ratio=mlp_ratio,
                                 qkv_bias=qkv_bias, qk_scale=qk_scale,
                                 drop=drop, attn_drop=attn_drop,
                                 drop_path=drop_path[i] if isinstance(drop_path, list) else drop_path,
                                 norm_layer=norm_layer)
            for i in range(depth)])

        # patch expanding layer
        if upsample is not None:
            self.upsample = upsample(input_resolution, dim=dim, norm_layer=norm_layer)
        else:
            self.upsample = None

    def forward(self, x):
        for blk in self.blocks:
            if self.use_checkpoint:
                x = checkpoint.checkpoint(blk, x)
            else:
                x = blk(x)
        if self.upsample is not None:
            x = self.upsample(x)
        return x

class SwinTransformerSys(nn.Module):
    def __init__(self, img_size=224, patch_size=4, in_chans=3, num_classes=1000,
                 embed_dim=96, depths=[2, 2, 6, 2], num_heads=[3, 6, 12, 24],
                 window_size=7, mlp_ratio=4., qkv_bias=True, qk_scale=None,
                 drop_rate=0., attn_drop_rate=0., drop_path_rate=0.1,
                 norm_layer=nn.LayerNorm, ape=False, patch_norm=True,
                 use_checkpoint=False, final_upsample="expand_first", **kwargs):
        super().__init__()

        self.img_size = img_size
        self.patch_size = patch_size
        self.in_chans = in_chans
        self.num_classes = num_classes
        self.num_layers = len(depths)
        self.embed_dim = embed_dim
        self.ape = ape
        self.patch_norm = patch_norm
        self.num_features = int(embed_dim * 2 ** (self.num_layers - 1))
        self.mlp_ratio = mlp_ratio
        self.final_upsample = final_upsample

        # split image into non-overlapping patches
        self.patch_embed = PatchEmbed(
            img_size=img_size, patch_size=patch_size, in_chans=in_chans, embed_dim=embed_dim,
            norm_layer=norm_layer if self.patch_norm else None)
        num_patches = self.patch_embed.num_patches
        patches_resolution = self.patch_embed.patches_resolution
        self.patches_resolution = patches_resolution

        # absolute position embedding
        if self.ape:
            self.absolute_pos_embed = nn.Parameter(torch.zeros(1, num_patches, embed_dim))
            trunc_normal_(self.absolute_pos_embed, std=.02)

        self.pos_drop = nn.Dropout(p=drop_rate)

        # stochastic depth
        dpr = [x.item() for x in torch.linspace(0, drop_path_rate, sum(depths))]  # stochastic depth decay rule

        # build encoder layers
        self.layers = nn.ModuleList()
        for i_layer in range(self.num_layers):
            layer = BasicLayer(dim=int(embed_dim * 2 ** i_layer),
                               input_resolution=(patches_resolution[0] // (2 ** i_layer),
                                                 patches_resolution[1] // (2 ** i_layer)),
                               depth=depths[i_layer],
                               num_heads=num_heads[i_layer],
                               window_size=window_size,
                               mlp_ratio=self.mlp_ratio,
                               qkv_bias=qkv_bias, qk_scale=qk_scale,
                               drop=drop_rate, attn_drop=attn_drop_rate,
                               drop_path=dpr[sum(depths[:i_layer]):sum(depths[:i_layer + 1])],
                               norm_layer=norm_layer,
                               downsample=PatchMerging if (i_layer < self.num_layers - 1) else None,
                               use_checkpoint=use_checkpoint)
            self.layers.append(layer)

        self.norm = norm_layer(self.num_features)

        # build decoder layers
        self.layers_up = nn.ModuleList()
        self.concat_back_dim = nn.ModuleList()
        for i_layer in range(self.num_layers):
            concat_linear = nn.Linear(2 * int(embed_dim * 2 ** (self.num_layers - 1 - i_layer)),
                                      int(embed_dim * 2 ** (self.num_layers - 1 - i_layer)), bias=False) if i_layer > 0 else nn.Identity()
            if i_layer == 0:
                layer_up = PatchExpand(input_resolution=(patches_resolution[0] // (2 ** (self.num_layers - 1)),
                                                         patches_resolution[1] // (2 ** (self.num_layers - 1))),
                                       dim=int(embed_dim * 2 ** (self.num_layers - 1)), dim_scale=2, norm_layer=norm_layer)
            else:
                res_scale = 2 ** (self.num_layers - 1 - i_layer)
                layer_up = BasicLayerUp(dim=int(embed_dim * 2 ** (self.num_layers - 1 - i_layer)),
                                       input_resolution=(patches_resolution[0] // res_scale,
                                                         patches_resolution[1] // res_scale),
                                       depth=depths[self.num_layers - 1 - i_layer],
                                       num_heads=num_heads[self.num_layers - 1 - i_layer],
                                       window_size=window_size,
                                       mlp_ratio=self.mlp_ratio,
                                       qkv_bias=qkv_bias, qk_scale=qk_scale,
                                       drop=drop_rate, attn_drop=attn_drop_rate,
                                       drop_path=dpr[sum(depths[:(self.num_layers - 1 - i_layer)]):sum(depths[:(self.num_layers - 1 - i_layer) + 1])],
                                       norm_layer=norm_layer,
                                       upsample=PatchExpand if (i_layer < self.num_layers - 1) else None,
                                       use_checkpoint=use_checkpoint)
            self.layers_up.append(layer_up)
            self.concat_back_dim.append(concat_linear)

        self.norm_up = norm_layer(self.embed_dim)

        if self.final_upsample == "expand_first":
            self.up = PatchExpand(input_resolution=patches_resolution, dim_scale=4, dim=embed_dim, norm_layer=norm_layer)
            self.output = nn.Conv2d(in_channels=embed_dim // 4, out_channels=num_classes, kernel_size=1, bias=False)

        self.apply(self._init_weights)

    def _init_weights(self, m):
        if isinstance(m, nn.Linear):
            trunc_normal_(m.weight, std=.02)
            if isinstance(m, nn.Linear) and m.bias is not None:
                nn.init.constant_(m.bias, 0)
        elif isinstance(m, nn.LayerNorm):
            nn.init.constant_(m.bias, 0)
            nn.init.constant_(m.weight, 1.0)

    def forward_features(self, x):
        x = self.patch_embed(x)
        if self.ape:
            x = x + self.absolute_pos_embed
        x = self.pos_drop(x)

        x_downsample = []
        for layer in self.layers:
            # Manually run blocks to save features before downsampling
            for blk in layer.blocks:
                if layer.use_checkpoint:
                    x = checkpoint.checkpoint(blk, x)
                else:
                    x = blk(x)
            x_downsample.append(x)
            if layer.downsample is not None:
                x = layer.downsample(x)

        x = self.norm(x)
        return x, x_downsample

    def forward_up_features(self, x, x_downsample):
        for inx, layer_up in enumerate(self.layers_up):
            if inx == 0:
                x = layer_up(x)
            else:
                x = torch.cat([x, x_downsample[3 - inx]], -1)
                x = self.concat_back_dim[inx](x)
                x = layer_up(x)
        x = self.norm_up(x)
        return x

    def up_x4(self, x):
        H, W = self.patches_resolution
        B, L, C = x.shape
        assert L == H * W, "input features has wrong size"
        if self.final_upsample == "expand_first":
            x = self.up(x) # B, 16*H*W, C//4
            x = x.view(B, 4 * H, 4 * W, -1)
            x = x.permute(0, 3, 1, 2) # B, C//4, 4*H, 4*W
            x = self.output(x) # B, num_classes, 4*H, 4*W
        return x

    def forward(self, x):
        x, x_downsample = self.forward_features(x)
        x = self.forward_up_features(x, x_downsample)
        x = self.up_x4(x)
        return x

def build_swin_unet(config):
    model = SwinTransformerSys(
        img_size=config.DATA.IMG_SIZE,
        patch_size=config.MODEL.SWIN.PATCH_SIZE,
        in_chans=config.MODEL.SWIN.IN_CHANS,
        num_classes=config.MODEL.NUM_CLASSES,
        embed_dim=config.MODEL.SWIN.EMBED_DIM,
        depths=config.MODEL.SWIN.DEPTHS,
        num_heads=config.MODEL.SWIN.NUM_HEADS,
        window_size=config.MODEL.SWIN.WINDOW_SIZE,
        mlp_ratio=config.MODEL.SWIN.MLP_RATIO,
        qkv_bias=config.MODEL.SWIN.QKV_BIAS,
        qk_scale=config.MODEL.SWIN.QK_SCALE,
        drop_rate=config.MODEL.DROP_RATE,
        drop_path_rate=config.MODEL.DROP_PATH_RATE,
        ape=config.MODEL.SWIN.APE,
        patch_norm=config.MODEL.SWIN.PATCH_NORM,
        use_checkpoint=config.TRAIN.USE_CHECKPOINT
    )
    return model
