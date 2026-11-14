import * as fs from 'fs';
import * as path from 'path';

const extensionRoot = path.resolve(__dirname, '..', '..');
// README files and their preview images stay at the repository root (GitHub landing page).
const repoRoot = path.resolve(extensionRoot, '..', '..');

type PackageJson = {
  repository: { url: string };
  homepage: string;
  bugs: { url: string };
};

function read(root: string, relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf-8');
}

function normalizeGithubRepo(url: string): string | null {
  const match = url.match(/github\.com\/([^/\s]+\/[^/#\s]+?)(?:\.git|#|\/|$)/i);
  return match ? match[1] : null;
}

function findImageSources(markdown: string): string[] {
  const markdownImages = [...markdown.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)].map((match) => match[1]);
  const htmlImages = [...markdown.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(
    (match) => match[1]
  );
  return [...markdownImages, ...htmlImages];
}

const REPOSITORY_RAW_IMAGE =
  /^https:\/\/github\.com\/woodfishhhh\/Woodfish-Theme\/raw\/(?:HEAD|v\d+\.\d+\.\d+)\/(.+)$/;

/** The owner's other projects the READMEs recommend to contributors (Obituary and its Scoop bucket). */
const OTHER_PROJECTS = new Set(['woodfishhhh/obituary', 'woodfishhhh/scoop-bucket']);

function findGithubRepos(markdown: string): string[] {
  return [...markdown.matchAll(/https:\/\/github\.com\/[^)\s"'<>`]+/gi)]
    .map((match) => normalizeGithubRepo(match[0]))
    .filter((repo): repo is string => repo !== null && !OTHER_PROJECTS.has(repo.toLowerCase()));
}

describe('marketplace metadata guardrails', () => {
  it('keeps README preview assets aligned with the published GitHub repository metadata', () => {
    const packageJson = JSON.parse(read(extensionRoot, 'package.json')) as PackageJson;
    const readmeZh = read(repoRoot, 'README.md');
    const readmeEn = read(repoRoot, 'README.en.md');
    const images = [...findImageSources(readmeZh), ...findImageSources(readmeEn)];
    const readmeRepos = new Set([...findGithubRepos(readmeZh), ...findGithubRepos(readmeEn)]);

    // The Marketplace renders the README outside the repository: no relative image paths.
    expect(images.filter((source) => !/^https:\/\//i.test(source))).toEqual([]);
    const repositoryImages = images
      .map((source) => REPOSITORY_RAW_IMAGE.exec(source)?.[1])
      .filter((imagePath): imagePath is string => imagePath !== undefined);
    expect(repositoryImages).toEqual(expect.arrayContaining(['assets/readme/hero.png']));
    for (const imagePath of repositoryImages) {
      expect({ imagePath, exists: fs.existsSync(path.join(repoRoot, imagePath)) }).toEqual({
        imagePath,
        exists: true,
      });
    }

    expect(readmeRepos.size).toBe(1);

    const [canonicalRepo] = [...readmeRepos];

    expect(normalizeGithubRepo(packageJson.repository.url)).toBe(canonicalRepo);
    expect(normalizeGithubRepo(packageJson.homepage)).toBe(canonicalRepo);
    expect(normalizeGithubRepo(packageJson.bugs.url)).toBe(canonicalRepo);
  });
});
