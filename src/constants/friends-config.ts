export interface FriendLink {
  site: string;
  url: string;
  owner: string;
  desc: string;
  image: string;
  color?: string;
}

// 示例友链数据 - 请替换为你自己的友链
export const friendsData: FriendLink[] = [
  {
    site: '示例博客 A',
    url: 'https://example-a.com',
    owner: 'Alice',
    desc: '一个热爱技术的开发者',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    color: '#BEDCFF',
  },
  {
    site: '示例博客 B',
    url: 'https://example-b.com',
    owner: 'Bob',
    desc: '分享生活与技术的小站',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    color: '#FBC1CC',
  },
  {
    site: '示例博客 C',
    url: 'https://example-c.com',
    owner: 'Carol',
    desc: '记录学习与成长的地方',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol',
    color: '#ABDCFF',
  },
];

export const friendsIntro = {
  title: '友情链接',
  subtitle: '欢迎交换友链！',
  applyTitle: '申请友链',
  applyDesc: '请在本页留言，格式如下',
  exampleYaml: `- site: 你的博客名称 # 站点名称
  url: https://your-blog.com/ # 站点网址
  owner: 你的昵称 # 昵称
  desc: 站点简介 # 站点简介
  image: https://your-blog.com/avatar.jpg # 头像链接
  color: "#ffc0cb" # 主题色（可选）`,
};
