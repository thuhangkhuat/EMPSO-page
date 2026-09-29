# EMPSO: Evolutionary Multimodal Particle Swarm Optimization for Minimum Time Search of a Lost Target with Multiple UAVs

Project page for the EMPSO paper by Thu Hang Khuat, Hai Trung Le, Khanh Thanh Tran, Thuy Pham, and Manh Duong Phung.

- **Code:** https://github.com/thuhangkhuat/EMPSO_target_search
- **Video:** https://youtu.be/7yOEKzaUbeI

## Editing the page

All content lives in [`src/paper.mdx`](src/paper.mdx) (frontmatter: title, authors, links; body: sections, equations, figures). Figures are in `src/assets/` and are compressed to AVIF automatically at build time.

## Local preview

```bash
bun install
bun run dev      # http://localhost:4321
bun run build    # static site in ./dist
```

## Deployment

Push to `main`. The GitHub Actions workflow in `.github/workflows/` builds the site and deploys it to GitHub Pages (Settings → Pages → Source: **GitHub Actions**). The site URL and base path are set automatically by the workflow.

## Credits

Built with Roman Hauksson-Neill's [academic project page template](https://github.com/RomanHauksson/academic-project-astro-template), adapted from the [Nerfies](https://nerfies.github.io/) project page (CC BY-SA 4.0).
