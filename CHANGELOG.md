# Changelog

All notable changes to this project will be documented in this file. See [conventional commits](https://www.conventionalcommits.org/) for commit guidelines.

---

## [2.1.0](https://github.com/cosZone/astro-koharu/compare/v2.0.0..v2.1.0) - 2026-01-15

### Bug Fixes

- h1 toc counter css - ([bccd9db](https://github.com/cosZone/astro-koharu/commit/bccd9dbdc6794418b962bb9c35ff06945bdb411a)) - yusixian

### Features

- enhance RSS feed with stable GUID - ([90d0d06](https://github.com/cosZone/astro-koharu/commit/90d0d062770fd026c31316b93c816eaa251aebd0)) - yusixian
- enhance dark mode support - ([1edf88c](https://github.com/cosZone/astro-koharu/commit/1edf88c73e0f466a1f2e3627dedb914c45bad887)) - yusixian

---

## [2.0.0](https://github.com/cosZone/astro-koharu/compare/v1.4.0..v2.0.0) - 2026-01-11

### Breaking Changes

- Configuration file changed from `_config.yml` to `config/site.yaml`
- Umami analytics config moved from environment variables to `site.yaml`
- Remark42 comment config moved to `site.yaml`
- Navigation items now defined in `site.yaml` instead of hardcoded in components

### Features

- **Koharu CLI**: add interactive TUI tool for blog management with backup, restore, update, generate, clean, and list commands - ([7909b64](https://github.com/cosZone/astro-koharu/commit/7909b64)) - yusixian
- **YAML Config**: migrate configuration from `_config.yml` to `config/site.yaml` with full type safety - ([467b8a3](https://github.com/cosZone/astro-koharu/commit/467b8a3)) - yusixian

### Refactor

- migrate comment (Remark42) and analytics (Umami) configurations to site.yaml - ([0014284](https://github.com/cosZone/astro-koharu/commit/0014284)) - yusixian
- update navigation icons configuration to use Iconify format in site.yaml - ([b204bff](https://github.com/cosZone/astro-koharu/commit/b204bff)) - yusixian

---

## [1.4.0](https://github.com/cosZone/astro-koharu/compare/v1.3.0..v1.4.0) - 2026-01-03

### Bug Fixes

- christmas ornament toggle styles - ([e9cb297](https://github.com/cosZone/astro-koharu/commit/e9cb29729f071cf3b963c3c160ff47374c330250)) - yusixian
- timezone utc bug - ([fb75902](https://github.com/cosZone/astro-koharu/commit/fb759025feda9f9c1199ae34210ac938b92c1620)) - yusixian
- wrap tags in links for improved navigation in PostItemCard - ([f236e65](https://github.com/cosZone/astro-koharu/commit/f236e653600e321ee764a4118dd5168027bba393)) - yusixian
- refine Christmas ornament toggle animations and styles - ([6ecf4de](https://github.com/cosZone/astro-koharu/commit/6ecf4de8f118048260dbf396d9d6f34c92e37ad1)) - yusixian
- enhance christmas effects toggle - ([98e66f7](https://github.com/cosZone/astro-koharu/commit/98e66f7eca98a1ccbb8965bd60483e639260bfad)) - yusixian
- TOC dropdown number - ([eda5586](https://github.com/cosZone/astro-koharu/commit/eda5586c0a7612b34178068835fbe7528c9b93cb)) - yusixian
- view transition effects to HomeInfo and HomeSider - ([aba7db4](https://github.com/cosZone/astro-koharu/commit/aba7db4a6daaa6ff8ec569d692c29f82ad0f3824)) - yusixian
- update SnowParticles resolution init - ([db81256](https://github.com/cosZone/astro-koharu/commit/db81256b80f13ffccb3b952b4503b7e85d495550)) - yusixian

### Features

- add CollapsibleTags - ([51eca18](https://github.com/cosZone/astro-koharu/commit/51eca18b346430a486101cd643d1c6f2e3b4cb96)) - yusixian
- implement tag normalization and introduce TagItem component for improved tag display - ([d944ff4](https://github.com/cosZone/astro-koharu/commit/d944ff48fc145b53298eb731bf578475a021fd1f)) - yusixian
- add optional updated date field to blog schema - ([55823e3](https://github.com/cosZone/astro-koharu/commit/55823e3856108c9bcab12733e2a513b693cf614a)) - yusixian
- enhance Christmas lights component performance optimizations - ([f33b612](https://github.com/cosZone/astro-koharu/commit/f33b612713e5cd8e8bfd758e11b7d8a906c9b286)) - yusixian

### Performance

- optimize snow performance - ([fa0db76](https://github.com/cosZone/astro-koharu/commit/fa0db76435f3d3626ad8dc9e8bf7f7232eae00a9)) - yusixian

---

## [1.3.0](https://github.com/cosZone/astro-koharu/compare/v1.2.0..v1.3.0) - 2025-12-24

### Bug Fixes

- add lazy loading and decoding attributes for images inside links - ([98ddcbc](https://github.com/cosZone/astro-koharu/commit/98ddcbccb20c5804c0044253cefb42235740a6a0)) - yusixian
- update link preview sanitization to use originUrl for accurate URL representation - ([8c2db02](https://github.com/cosZone/astro-koharu/commit/8c2db024d67abf547f6a038d1f139d60730f91bd)) - yusixian
- font resource split - ([e07dbda](https://github.com/cosZone/astro-koharu/commit/e07dbdace920e230992fff63081df201317fdebf)) - yusixian
- apply LQIP style directly to image in CategoryCards - ([c2f5e8d](https://github.com/cosZone/astro-koharu/commit/c2f5e8ddf37233a3021037c9aae332fb82351387)) - yusixian
- mermaid navigation fix for client-side navigation - ([fc9b0d7](https://github.com/cosZone/astro-koharu/commit/fc9b0d77d4c86ccdfbb81065e7df8d6f6b4c6d6a)) - yusixian

### Features

- add Christmas lights and ornament toggle components for festive decoration - ([fea95df](https://github.com/cosZone/astro-koharu/commit/fea95df1af9f2e19d6497ac8f85b1f5834b8224a)) - yusixian
- enhance snowfall effects with layered rendering and parallax support - ([6218b98](https://github.com/cosZone/astro-koharu/commit/6218b98c8e903d47320e9951d7fa3df607802751)) - yusixian
- add Christmas effects including snowfall, hat, and color scheme customization - ([d355d5a](https://github.com/cosZone/astro-koharu/commit/d355d5a64c9d4b07a3f400bd78ed02bd2ef0a125)) - yusixian
- implement lightbox functionality with zoom and portrait image grouping - ([db8179f](https://github.com/cosZone/astro-koharu/commit/db8179f7210020d1650fafc043169d890f1771e0)) - yusixian
- enhance image handling with lazy loading, error placeholders - ([51d2a13](https://github.com/cosZone/astro-koharu/commit/51d2a13b8a56f9d372a0deb1ab0b056f8b3b6963)) - yusixian
- enhance Mermaid diagram handling - ([57a7611](https://github.com/cosZone/astro-koharu/commit/57a76112b504a125fb577026db095018bf679497)) - yusixian
- integrate Mermaid support for enhanced diagram rendering and interaction - ([55e7501](https://github.com/cosZone/astro-koharu/commit/55e75018113d5e87dd15c3de9a006fe821a585b7)) - yusixian

---

## [1.2.0](https://github.com/cosZone/astro-koharu/compare/v1.1.0..v1.2.0) - 2025-12-20

### Documentation

- update README - ([945a467](https://github.com/cosZone/astro-koharu/commit/945a4673ba167656cb6b30aef03b29a1076e7486)) - yusixian

### Features

- add LQIP with gradient - ([9f2ceee](https://github.com/cosZone/astro-koharu/commit/9f2ceeec274ba6884e89d46e11d55f08004d2933)) - yusixian
- add Bear Days font when no logo - ([c967a97](https://github.com/cosZone/astro-koharu/commit/c967a974fa7094d5b8c61f78cfffc78c0ec645fe)) - yusixian
- add mobile post header with dynamic heading display and scroll tracking - ([2fcf782](https://github.com/cosZone/astro-koharu/commit/2fcf782128f2432d45986a2c04c1e3de4fd559c8)) - yusixian
- enhance search dialog with keyboard navigation - ([b29d144](https://github.com/cosZone/astro-koharu/commit/b29d1445639232b30a3aee7a74aef590a38d08ef)) - yusixian

### Performance

- optimize font & image - ([de1d6e9](https://github.com/cosZone/astro-koharu/commit/de1d6e91519a155a2f79b323c55bdcefb2abd133)) - yusixian

---

## [1.1.0](https://github.com/cosZone/astro-koharu/compare/v1.0.1..v1.1.0) - 2025-12-13

### Bug Fixes

- textRef type - ([e7b3004](https://github.com/cosZone/astro-koharu/commit/e7b30045efb7257875444e3276e540f42ef1476e)) - yusixian
- mobile menu icon - ([0f50dc4](https://github.com/cosZone/astro-koharu/commit/0f50dc4a8eaa6fca09a7cc5219d3f15fbfd8a2bf)) - yusixian
- exclude headings inside .link-preview-block for TOC - ([689d77e](https://github.com/cosZone/astro-koharu/commit/689d77ed643b6f322313574e5c2e0ed3e430c095)) - yusixian

### Documentation

- add AI summarization feature - ([270c11d](https://github.com/cosZone/astro-koharu/commit/270c11da01933be2fb2ad19bce8cc73b43d12ccf)) - yusixian

### Features

- add AI summary generation and enhance post description handling - ([0b93114](https://github.com/cosZone/astro-koharu/commit/0b931145639eb2a7d61708a386935a983d8e0e3e)) - yusixian
- implement semantic article recommendation system using transformers.js - ([72cf50d](https://github.com/cosZone/astro-koharu/commit/72cf50dec4475fe60c8554c6c5e5472c9491aafa)) - yusixian
- optimize home sider ui - ([d65b5ca](https://github.com/cosZone/astro-koharu/commit/d65b5cad13fe3128520993ba4830cf0ea1358997)) - yusixian
- add new RSS feed layout with profile settings - ([61c0a9c](https://github.com/cosZone/astro-koharu/commit/61c0a9c7da78ae241918eea2595aba48289734ed)) - yusixian
- enhance post description handling - ([044d278](https://github.com/cosZone/astro-koharu/commit/044d2781c8cea43deb5b4e2b85ae5bb2ae9bc4a7)) - yusixian

---

## [1.0.1](https://github.com/cosZone/astro-koharu/compare/v1.0.0..v1.0.1) - 2025-12-06

### Documentation

- initialize cliff and update changelog - ([f1abb42](https://github.com/cosZone/astro-koharu/commit/f1abb4280c6a6713edb8430a670636a1fef90e2c)) - yusixian

### Features

- add slide-in and slide-out animations for sider component - ([577a7f5](https://github.com/cosZone/astro-koharu/commit/577a7f58673183742bc95f0753b77b3afcc24dc3)) - yusixian
- add CodePen embed support - ([4ad5abf](https://github.com/cosZone/astro-koharu/commit/4ad5abffc1d1ecc5b9d023502eb305683ec873c7)) - yusixian
- add link preview for tweets and general links - ([5f34617](https://github.com/cosZone/astro-koharu/commit/5f34617cad93405b2fbf66e7296613760b17af68)) - yusixian

---

## [1.0.0] - 2025-12-06

### Bug Fixes

- update React 19.2.1 for CVE-2025-55182 - ([ee9b120](https://github.com/cosZone/astro-koharu/commit/ee9b1209fcd8b0ef8e589b0b928d5ad5ac0ccdd0)) - yusixian
- adjust scroll progress bar height for improved visibility - ([8b13c2d](https://github.com/cosZone/astro-koharu/commit/8b13c2dd54e453b0fd852156c8e52f0b2b97542d)) - yusixian
- remove rel noopener noreferrer for link - ([2232502](https://github.com/cosZone/astro-koharu/commit/2232502de0b83f7bcf9eb0641a6fcc29e4fd1cad)) - yusixian
- detect code language - ([06b14c0](https://github.com/cosZone/astro-koharu/commit/06b14c0d0d369dd0acbced5636ccdc698c47a604)) - yusixian
- adjust vertical alignment of list counters in markdown styles - ([4b6d66b](https://github.com/cosZone/astro-koharu/commit/4b6d66b31465aee3cd719d6907ca5bd9a11dd300)) - yusixian
- update color code for friend link in friends-config - ([964cd26](https://github.com/cosZone/astro-koharu/commit/964cd26b05011f386a50711e4b5a58cb88b8a99a)) - yusixian
- scroll-state build error - ([6b469bd](https://github.com/cosZone/astro-koharu/commit/6b469bda6a5d07cc72deb3a6c5b3aaacee67ae2f)) - yusixian
- update text color on hover in DropdownNav component - ([ea97959](https://github.com/cosZone/astro-koharu/commit/ea979599b0dc6e969c5e906074e67361b4f310b5)) - yusixian
- add post to MobileDrawer and Layout components and enhance pagefind css - ([4ca8a44](https://github.com/cosZone/astro-koharu/commit/4ca8a448e8bea2c1c387d94f01b6e2ac3dc83db9)) - yusixian
- adjust alignment in WeeklyCover - ([155da1a](https://github.com/cosZone/astro-koharu/commit/155da1a34a33bb9e079bc117f8f272e137ac23ff)) - yusixian
- remove unnecessary border - ([2d0f9ca](https://github.com/cosZone/astro-koharu/commit/2d0f9caf7ed456453926d56adc33d68b465eaa79)) - yusixian
- adjust positioning of info more - ([c814e71](https://github.com/cosZone/astro-koharu/commit/c814e71a145c5e808ebce025d2426c69a0daee76)) - yusixian
- quaily - ([34b672c](https://github.com/cosZone/astro-koharu/commit/34b672c579165708bf9281f08a7ceb74883d8b4a)) - yusixian
- mobile menu icon - ([7a0f783](https://github.com/cosZone/astro-koharu/commit/7a0f783657f8088cd325bbc91e7a1f24d1dde8bb)) - yusixian
- old image error - ([76ef77c](https://github.com/cosZone/astro-koharu/commit/76ef77c64d85fe68ed58e958643c57d75b7d0c0c)) - yusixian
- social transition - ([b8c6137](https://github.com/cosZone/astro-koharu/commit/b8c613739dc03adc776ca33af3278931bf1a7718)) - yusixian
- menu icon view transition error - ([cc51267](https://github.com/cosZone/astro-koharu/commit/cc51267585621f4c792a27ea7cc28a19aac19f10)) - yusixian
- transition error - ([2463629](https://github.com/cosZone/astro-koharu/commit/2463629939c09a686f7534da376b6d8120341773)) - yusixian
- layout ui - ([a3d2a0f](https://github.com/cosZone/astro-koharu/commit/a3d2a0f9da9a68f23e63dee861ff02efedc7f533)) - yusixian
- ui - ([c6d9353](https://github.com/cosZone/astro-koharu/commit/c6d93530bc49049c80542a7fb6391ce64e82fffd)) - yusixian
- add transition only theme toggle & fix error - ([5a664e0](https://github.com/cosZone/astro-koharu/commit/5a664e088795ff0c0aa02d16c7cc2543f4ac7571)) - yusixian
- mobile menu button ui - ([4e8c382](https://github.com/cosZone/astro-koharu/commit/4e8c38203cc9b85e32675217be1f52e37ab4948d)) - yusixian
- shoka decoration circle ui - ([0b22747](https://github.com/cosZone/astro-koharu/commit/0b22747fd6225eee011a4f0580dc3b7f21d3f2a2)) - yusixian
- post max width & new blog - ([8ddbeae](https://github.com/cosZone/astro-koharu/commit/8ddbeaee96ef8845bf1960ab85cd47026621ed80)) - yusixian
- divider ui - ([f368649](https://github.com/cosZone/astro-koharu/commit/f3686492435ce8189c798fe5f7fe2df3868be814)) - yusixian
- social tooltip interactive false - ([c654f56](https://github.com/cosZone/astro-koharu/commit/c654f560ed1d589941156495cf9f283cd0023a9a)) - yusixian
- tag ui - ([fd41607](https://github.com/cosZone/astro-koharu/commit/fd416076bbeaa580056bd7d2d4b9793589634961)) - yusixian
- tag ui - ([9cf3774](https://github.com/cosZone/astro-koharu/commit/9cf3774d8b663269b5c3ef50aa40ce37535fa525)) - yusixian
- error in tag include '/' - ([d3d4fa3](https://github.com/cosZone/astro-koharu/commit/d3d4fa3936ebd75dea34ef0d3f43fd6ea6a30ee6)) - yusixian
- transform config path - ([aace422](https://github.com/cosZone/astro-koharu/commit/aace42275916dcf5ab83e0cf8232fe854fbb634f)) - yusixian
- remove error transition persist - ([f98cb8b](https://github.com/cosZone/astro-koharu/commit/f98cb8bda6c7452b39059719a54306b852e2f3bf)) - yusixian
- build error - ([f5afd1d](https://github.com/cosZone/astro-koharu/commit/f5afd1da27ed39d4135b00decede481022152b57)) - yusixian
- category ui - ([258c49f](https://github.com/cosZone/astro-koharu/commit/258c49f02206523d8ec018f376e76ff9e2608f7f)) - yusixian
- dark mode ui - ([f29ccec](https://github.com/cosZone/astro-koharu/commit/f29ccec441839b9869d5b39758df71fd7eda4c69)) - yusixian
- build error - ([30b52be](https://github.com/cosZone/astro-koharu/commit/30b52be5c59ff5fa60328e11cb69983f9d60001f)) - yusixian
- mobile adapt - ([5779593](https://github.com/cosZone/astro-koharu/commit/577959398eec7f1339f3344d9e720fa21ec7b389)) - yusixian
- dark prose - ([8d6e122](https://github.com/cosZone/astro-koharu/commit/8d6e122842e64a0bace8f75496c16e9cbdb97ddf)) - yusixian
- build error - ([5adc907](https://github.com/cosZone/astro-koharu/commit/5adc907cd3dd720e99bb9a8a37a19e3587c381ab)) - yusixian
- update header ui - ([bd96148](https://github.com/cosZone/astro-koharu/commit/bd961482c7861f17ea01bfd831285a4a930e4663)) - yusixian
- Paginator build error and enhance Header view transition - ([0b55aae](https://github.com/cosZone/astro-koharu/commit/0b55aae409ffde79c65267619c4809e59d6f256c)) - yusixian

### Build

- update tailwind 4.0 and astro 5.2 - ([81e70a1](https://github.com/cosZone/astro-koharu/commit/81e70a19e121d0dbab0bf72449f44c536e4ab95b)) - yusixian
- update Astro config trailingSlash to 'never' - ([96deda0](https://github.com/cosZone/astro-koharu/commit/96deda007e8f42949be3553ae6e6f4d92b0518b8)) - yusixian
- add husky and lint-stage & format blog by lint-md - ([e274b07](https://github.com/cosZone/astro-koharu/commit/e274b07348b7a0c2cdde618e9e6dee5bbd28fd89)) - yusixian
- add git cliff to generate CHANGELOG - ([2094ee1](https://github.com/cosZone/astro-koharu/commit/2094ee18a0268c3ba14d055ff6d708deac3d5ce5)) - yusixian
- prettier & docs & lib - ([4b0ed1f](https://github.com/cosZone/astro-koharu/commit/4b0ed1fc22e64262812107d35335f88df74354b2)) - yusixian

### Documentation

- update README - ([87e26e5](https://github.com/cosZone/astro-koharu/commit/87e26e5e22a244275b90c7a031a8a6375cc13f9d)) - yusixian
- add comprehensive overview, architecture, content system, routing, component patterns, UI components, state management, theme system, animation system, styling, and markdown documentation for astro-koharu project - ([911f40b](https://github.com/cosZone/astro-koharu/commit/911f40b7caa3f1ea837e90e815e228b5c4fadb45)) - yusixian
- update CLAUDE.md instructions, add overview and architecture documentation, and enhance content system details - ([2805e2f](https://github.com/cosZone/astro-koharu/commit/2805e2f3a774fda436fa96de10bd9fd6a7133e6b)) - yusixian
- typo - ([11a9e17](https://github.com/cosZone/astro-koharu/commit/11a9e17cca6fbab1bd88a0d6f92746b532508ad7)) - yusixian
- remove proposal documents - ([28558f2](https://github.com/cosZone/astro-koharu/commit/28558f2595446df10d85d60540f32f513b272400)) - yusixian
- add OpenSpec instructions and project context documentation - ([2fd00fb](https://github.com/cosZone/astro-koharu/commit/2fd00fb22fa50be150f3252febfdbf66f3190069)) - yusixian
- add ai docs - ([46b6fcf](https://github.com/cosZone/astro-koharu/commit/46b6fcf08f07d5798dc98db8cd55aae3a7cc2e04)) - yusixian
- update changelog - ([c13767c](https://github.com/cosZone/astro-koharu/commit/c13767c917297ecb740204f0590169cf57803c97)) - yusixian
- update README and favicon - ([16e775d](https://github.com/cosZone/astro-koharu/commit/16e775df89104611a6314d7d145f4f2e1a762012)) - yusixian
- add todo - ([9f68175](https://github.com/cosZone/astro-koharu/commit/9f681750cbd39ad0f0e6dd8dc30a6464a762a976)) - yusixian
- new todos - ([5f5c461](https://github.com/cosZone/astro-koharu/commit/5f5c461bd558200f182411755c0a2a068ca2a05a)) - yusixian

### Features

- add draft functionality for blog posts - ([0facf4d](https://github.com/cosZone/astro-koharu/commit/0facf4d03764555183b9df90692932809114cb2e)) - yusixian
- add new friend - ([3dd6670](https://github.com/cosZone/astro-koharu/commit/3dd667018291bda7476d2a01907d46757c13373e)) - yusixian
- enhance dialog components and improve script initialization - ([e10122b](https://github.com/cosZone/astro-koharu/commit/e10122b5e36e9ede1b0b174b988ee27b6dfa3a93)) - yusixian
- implement search dialog and code block fullscreen functionality - ([6e3ef2f](https://github.com/cosZone/astro-koharu/commit/6e3ef2f39423af41cfb4d1a5e1d831d09ddc4d57)) - yusixian
- add preClassName, preStyle, and codeClassName to code block components for enhanced styling options - ([8eddf22](https://github.com/cosZone/astro-koharu/commit/8eddf224057309bcb3ca2d28c0d312f917827945)) - yusixian
- enhance code block functionality with fullscreen preview, copy feature, and heading level labels - ([db5b4d5](https://github.com/cosZone/astro-koharu/commit/db5b4d5e2644c7b164f1a2d7dff218900785b8b6)) - yusixian
- implement friends section with FriendCard, FriendRequestForm, and FriendsGrid components - ([c84ff54](https://github.com/cosZone/astro-koharu/commit/c84ff54cdd62f09755199693a26a4cf804c12804)) - yusixian
- add search scroll-feather-mask - ([2c9bf6d](https://github.com/cosZone/astro-koharu/commit/2c9bf6d8621a895a40d6aa622dc2176dae29242c)) - yusixian
- enhance search dialog with update styles - ([3442a0b](https://github.com/cosZone/astro-koharu/commit/3442a0baa349aa61acc3d38361af28e22f5e96d4)) - yusixian
- integrate pagefind for enhanced search functionality and add search dialog component - ([e637a67](https://github.com/cosZone/astro-koharu/commit/e637a67ad0f1b1f930362141ac587f3baa38fdca)) - yusixian
- add new avatar image and update site description - ([8d96dd7](https://github.com/cosZone/astro-koharu/commit/8d96dd7320181e9cda4823342baf86e6c04a9ca9)) - yusixian
- integrate FloatingPortal into Popover - ([68de6d4](https://github.com/cosZone/astro-koharu/commit/68de6d4912958d9c7979cf44f92bbd703fe8e7a0)) - yusixian
- add weekly & replace markdown-it & update ui - ([a2c12dd](https://github.com/cosZone/astro-koharu/commit/a2c12dd320fbbc50f5f998d76077a2fac2f144f6)) - yusixian
- add new cover images & update layout - ([04f87c4](https://github.com/cosZone/astro-koharu/commit/04f87c49df7b0f0a70d73ed622e05e141aa9a1fe)) - yusixian
- update font config & footer - ([2331edc](https://github.com/cosZone/astro-koharu/commit/2331edc72bded7d69557fd4c5205999756ad4225)) - yusixian
- add ScrollProgress - ([5b12502](https://github.com/cosZone/astro-koharu/commit/5b12502146a3b4a9b2a5fef0f11b98817e2c8735)) - yusixian
- add footer component with site statistics and copyright information - ([f44cfd4](https://github.com/cosZone/astro-koharu/commit/f44cfd43ac34efda1ad94eedc5504c9f15b1cff6)) - yusixian
- add sticky post and update PostList - ([b0dcf5b](https://github.com/cosZone/astro-koharu/commit/b0dcf5bb7178fd6220e0f3950c51d63f2d5ed4e5)) - yusixian
- enhance HomeSider with animation transitions and improve content visibility management - ([360241b](https://github.com/cosZone/astro-koharu/commit/360241b775ec6161488aad437b43474e7f1d283f)) - yusixian
- add series navigation and post list components to enhance post viewing experience - ([2687e3c](https://github.com/cosZone/astro-koharu/commit/2687e3cd9aebb4b06340f8a68d471be965a9c042)) - yusixian
- add knip configuration - ([029fd4c](https://github.com/cosZone/astro-koharu/commit/029fd4c8f8fdf3bc5f9466ded3eb6fe7439d8014)) - yusixian
- add comprehensive documentation for Component API Standards and Hydration Strategy; introduce FloatingErrorBoundary component for enhanced error handling in floating UI elements - ([09655fb](https://github.com/cosZone/astro-koharu/commit/09655fbff68fdf5124dcd7e62683f5dad10ac69e)) - yusixian
- add custom hooks for state management and media queries - ([03c9470](https://github.com/cosZone/astro-koharu/commit/03c9470c2c88d0d470303b91cabcd9ec00f6d0c1)) - yusixian
- add LatestComments and RandomPostList - ([4f665cb](https://github.com/cosZone/astro-koharu/commit/4f665cb928acc15ad36b935fcc4ba6c58c1a8b96)) - yusixian
- enhance Remark component with theme change and fix floating - ([bd6cf2d](https://github.com/cosZone/astro-koharu/commit/bd6cf2dec659c3915348d12cf54a02cc9bb81ea1)) - yusixian
- add Remark component for comments integration - ([d8ce067](https://github.com/cosZone/astro-koharu/commit/d8ce06799ee483718c0d838ff73e5b5a0e51de57)) - yusixian
- edit - ([9deadf6](https://github.com/cosZone/astro-koharu/commit/9deadf674701847ae23a80f3b0466cdcc2cff6e2)) - yusixian
- add Shiki theme config - ([0f711cf](https://github.com/cosZone/astro-koharu/commit/0f711cfc0dfc87f59030e5dd241145128d91c301)) - yusixian
- add breadcrumb navigation for categories in post - ([a6e2f97](https://github.com/cosZone/astro-koharu/commit/a6e2f976692f1f8451b5fb37b74e272fe91ca28b)) - yusixian
- anchor smoothScroll config - ([6d483ae](https://github.com/cosZone/astro-koharu/commit/6d483aec52987a24cbab75b07cc798b419edf8a9)) - yusixian
- custom content headings & hash - ([e977610](https://github.com/cosZone/astro-koharu/commit/e977610086b4e8a5dbf4c17f085d932f439dcbdd)) - yusixian
- update HomeSider type in mobile - ([d798faf](https://github.com/cosZone/astro-koharu/commit/d798faf46ed9ead0194a4d0ae8d58ba3344aaed8)) - yusixian
- post directory - ([f5e2bb4](https://github.com/cosZone/astro-koharu/commit/f5e2bb437a371a258f3cf10786a52381d166a762)) - yusixian
- update rss ui - ([ceb1cff](https://github.com/cosZone/astro-koharu/commit/ceb1cffeb91abba494e5b1018e7f285fea9eee51)) - yusixian
- add new rss feed styles - ([d7e6850](https://github.com/cosZone/astro-koharu/commit/d7e6850880f55ea687ad26ac5488424315d7b026)) - yusixian
- add HomeSider to mobile drawer - ([a501138](https://github.com/cosZone/astro-koharu/commit/a50113835b98b8450dd32d30b28f06203b7c9ec6)) - yusixian
- new toggle btn - ([c50823a](https://github.com/cosZone/astro-koharu/commit/c50823a06817e1eea353805e83677901ea359173)) - yusixian
- dark theme toggle anim - ([8d3173a](https://github.com/cosZone/astro-koharu/commit/8d3173a8f15bb7958d4aa108eb70e029bbc1959d)) - yusixian
- home post card categoryStr link - ([4f80515](https://github.com/cosZone/astro-koharu/commit/4f8051505d5858c4cf6b48212715ba0e337c398e)) - yusixian
- improve mobile menu and header scroll - ([8495b15](https://github.com/cosZone/astro-koharu/commit/8495b150a63778ba58985142c3447d2e9dc346da)) - yusixian
- add Umami analytics integration - ([bcb91ac](https://github.com/cosZone/astro-koharu/commit/bcb91ac420b4cd3f8119a9830c57805496907f78)) - yusixian
- parent category card - ([6555216](https://github.com/cosZone/astro-koharu/commit/6555216809686a4f13fd4c83d5e2986703a73a68)) - yusixian
- category card posts - ([1ae6b81](https://github.com/cosZone/astro-koharu/commit/1ae6b81808fa1b3309629a3234896ee4fc5d0fd2)) - yusixian
- add mobile drawer navigation for responsive design - ([eea368c](https://github.com/cosZone/astro-koharu/commit/eea368c894207186a7cde97a161a944ed01e184a)) - yusixian
- FloatingGroup - ([3652aae](https://github.com/cosZone/astro-koharu/commit/3652aaeab86f911c498b2bdaf2c786fdf00d7b8e)) - yusixian
- archives page & ui optimize - ([7050dfd](https://github.com/cosZone/astro-koharu/commit/7050dfd381e39eb15e2942d22adc35009048f3bf)) - yusixian
- home sider nav - ([ecaa389](https://github.com/cosZone/astro-koharu/commit/ecaa3892214c1c2daeef93f77c35a4629180c20f)) - yusixian
- header dropdown nav & socials anim - ([fc750d5](https://github.com/cosZone/astro-koharu/commit/fc750d5dba2501e101656560cce0a839f4ffb825)) - yusixian
- social items - ([930b538](https://github.com/cosZone/astro-koharu/commit/930b538661783c4114acd7ac5933ebb5d116516b)) - yusixian
- TwoColumnLayout - ([c826f2a](https://github.com/cosZone/astro-koharu/commit/c826f2a2ddf38e308117d809e16cc6b1b630bde4)) - yusixian
- RSS page & UI COS-52 - ([ba240f9](https://github.com/cosZone/astro-koharu/commit/ba240f931b928bcfd003eb3660d2cee395c7b2d2)) - yusixian
- sider tag link - ([e1e175a](https://github.com/cosZone/astro-koharu/commit/e1e175af01b76fbb57a4dbb2632a3980ccf93b98)) - yusixian
- tags page - ([6a74606](https://github.com/cosZone/astro-koharu/commit/6a746067c1a193fcdce1742fdfb097bfe474af19)) - yusixian
- category list & posts - ([236cc2d](https://github.com/cosZone/astro-koharu/commit/236cc2d8fd5c877625b01329793403c7c60791d2)) - yusixian
- enhance category ui - ([1b77a28](https://github.com/cosZone/astro-koharu/commit/1b77a28b327a28ff77c546fcc490384a3a8ab3a7)) - yusixian
- category list decoration - ([3f615b7](https://github.com/cosZone/astro-koharu/commit/3f615b7a18e803e197b72c0d93f13b98aeb48143)) - yusixian
- category pages - ([358af7c](https://github.com/cosZone/astro-koharu/commit/358af7ca231474138c9d6ac57bdd481ff4be7c3c)) - yusixian
- add more button in category card - ([160a420](https://github.com/cosZone/astro-koharu/commit/160a420e3d963bf3e2a7387ad648b92f7a5c72bd)) - yusixian
- link ui - ([997373d](https://github.com/cosZone/astro-koharu/commit/997373d197d4a602ffcf97d54d51b20a7f8e0d6c)) - yusixian
- category flipped card ui - ([4ce2163](https://github.com/cosZone/astro-koharu/commit/4ce2163b722bb4a3bc52a1440347f0e6596b4815)) - yusixian
- mobile adapt - ([30a0303](https://github.com/cosZone/astro-koharu/commit/30a0303df333d68a0894f8848f1303fe7f810612)) - yusixian
- add max-width utility and update layout components for improved responsiveness - ([82a4bcf](https://github.com/cosZone/astro-koharu/commit/82a4bcf20073b514d7d1e1475167e53e02c18608)) - yusixian
- update site post title - ([dc723ba](https://github.com/cosZone/astro-koharu/commit/dc723ba977650c9e5e0ad3fea8a5c73dc912d5c1)) - yusixian
- optimize scroll & update site config enableJSGridCover - ([d49fab9](https://github.com/cosZone/astro-koharu/commit/d49fab9da6ef8ddeb87e5b44b78a2e69bb7c6d63)) - yusixian
- enhance theme management - ([50f2ba9](https://github.com/cosZone/astro-koharu/commit/50f2ba90ceee82d935401ee24b20d690d404abe3)) - yusixian
- refactor cover to astro & some optimize - ([7de4d13](https://github.com/cosZone/astro-koharu/commit/7de4d138400ffd3a299cfec0438bb65c5677cea0)) - yusixian
- implement HomeSider astro component and update layout structure - ([8a4ae81](https://github.com/cosZone/astro-koharu/commit/8a4ae81df48ccce7c4920f97cee7b5cb413b936d)) - yusixian
- add prettier-plugin-astro format astro tailwind - ([fefde8a](https://github.com/cosZone/astro-koharu/commit/fefde8a32bae385b0e2603ead3286ffc3c9c5ae3)) - yusixian
- post with cover title - ([88e4f56](https://github.com/cosZone/astro-koharu/commit/88e4f56cda18e76e0664881faa216c123dc78c6d)) - yusixian
- refactor PostItemCard to Astro component and enhance layout - ([0b257c7](https://github.com/cosZone/astro-koharu/commit/0b257c7027d68bce6087701b5f24f0836653e3d9)) - yusixian
- enhance SEO and layout metadata - ([8ca4a12](https://github.com/cosZone/astro-koharu/commit/8ca4a12e8a853db3c2b5b7d3c330ba99cfe2544f)) - yusixian
- post page - ([b2899ca](https://github.com/cosZone/astro-koharu/commit/b2899ca1890928fd6fbe791bf602b6a605836e68)) - yusixian
- add tailwind-clip-path plugin and font; update PostItemCard and Cover components - ([78436b5](https://github.com/cosZone/astro-koharu/commit/78436b5883a6d1bcbacbc05c08df6416ca7fa475)) - yusixian
- refactor header to astro - ([696ba7e](https://github.com/cosZone/astro-koharu/commit/696ba7ea8ed0f3d0b0617e06fc9feee8a07ab9b1)) - yusixian
- add posts pagination and redirect root to posts page - ([ebe73a1](https://github.com/cosZone/astro-koharu/commit/ebe73a1b7dbdc855d8223fd85f825c09316be40c)) - yusixian
- about page - ([2f68bf6](https://github.com/cosZone/astro-koharu/commit/2f68bf6754586d57b4bcbac3720cade2107dc371)) - yusixian
- implement Paginator and PostList astro components - ([ff82b0f](https://github.com/cosZone/astro-koharu/commit/ff82b0fad3eaec282fa0ab43cd863d473d8a0770)) - yusixian
- implement blog post components and enhance error handling - ([18be75f](https://github.com/cosZone/astro-koharu/commit/18be75f372cd00d77af10a0ff4a251bcfbcc064f)) - yusixian
- add HomeSider and Cover - ([58023f1](https://github.com/cosZone/astro-koharu/commit/58023f1c62fdac84fa2185abbbb7a6335d0a2bd3)) - yusixian
- enhance layout and navigation with new components and styles - ([ee9c45a](https://github.com/cosZone/astro-koharu/commit/ee9c45a9719ac258cb0772b4bfec2ea5aead706a)) - yusixian
- add shadcn - ([0c6b430](https://github.com/cosZone/astro-koharu/commit/0c6b4303194d20021d923ac00ec6febb693a8736)) - yusixian
- init blogs - ([0801af7](https://github.com/cosZone/astro-koharu/commit/0801af7e366ab4ca47ecaebea720c6588c906c2f)) - yusixian

<!-- generated by git-cliff -->
