export interface StylePreset {
  id: string;
  title: string;
  description: string;
  colorPalette: string;
  worldSetting: string;
}

export const stylePresets: StylePreset[] = [
  {
    id: "ink-noir",
    title: "水墨黑色电影",
    description: "高反差黑白水墨、雨夜街巷、克制的红色点缀。",
    colorPalette: "墨黑、宣纸白、雾灰、朱砂红点缀，高对比低饱和",
    worldSetting: "整体采用水墨黑色电影气质：空间有宣纸纹理、浓淡墨层次和潮湿反光，人物与场景保持克制、冷峻、悬疑的影像语法。",
  },
  {
    id: "neon-studio",
    title: "霓虹摄影棚",
    description: "高饱和霓虹、透明材质、音乐录像带式的商业镜头。",
    colorPalette: "电光青、品红、深靛蓝、冷白高光，局部使用金属银",
    worldSetting: "画面像一套可控摄影棚：霓虹灯管、透明亚克力、湿润地面反射和锐利轮廓光贯穿所有角色、镜头和资产。",
  },
  {
    id: "warm-realism",
    title: "暖调现实剧",
    description: "自然光、生活化质感、亲密但不过度装饰的现实影像。",
    colorPalette: "暖米白、木色、柔和橄榄绿、夕阳橙，低对比自然肤色",
    worldSetting: "所有画面遵循现实主义生活剧质感：自然光源、真实材质、轻微胶片颗粒，构图服务人物关系和情绪变化。",
  },
  {
    id: "paper-cut",
    title: "剪纸奇幻",
    description: "层叠纸艺、民俗纹样、舞台化景深与手工边缘。",
    colorPalette: "石榴红、孔雀蓝、象牙白、松烟黑、少量金色描边",
    worldSetting: "世界像多层剪纸舞台：角色、道具和背景都带有纸张厚度、民俗纹样和手工裁切边缘，运动保持戏剧化层次。",
  },
  {
    id: "frost-tech",
    title: "冰蓝科幻档案",
    description: "清冷工业、半透明界面、实验室与城市边缘的未来感。",
    colorPalette: "冰蓝、石墨灰、冷白、警示黄少量点缀，整体低饱和",
    worldSetting: "视觉统一为冷峻科幻档案感：玻璃、金属、半透明界面和洁净工业空间形成核心资产语言，镜头保持理性和精确。",
  },
];

export function getStylePreset(id: string): StylePreset | null {
  return stylePresets.find((preset) => preset.id === id) ?? null;
}
