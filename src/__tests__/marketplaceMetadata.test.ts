import * as fs from 'fs';
import * as path from 'path';

const projectRoot = path.resolve(__dirname, '..', '..');

type PackageJson = {
  repository: { url: string };
  homepage: string;
  bugs: { url: string };
};

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf-8');
}

function normalizeGithubRepo(url: string): string | null {
  const match = url.match(/github\.com\/([^/\s]+\/[^/#\s]+?)(?:\.git|#|\/|$)/i);
  return match ? match[1] : null;
}

function findRelativeImagePaths(markdown: string): string[] {
  const markdownImages = [...markdown.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)].map((match) => match[1]);
  return markdownImages.filter((imagePath) => !/^(?:https?:)?\/\//i.test(imagePath));
}

function findGithubRepos(markdown: string): string[] {
  return [...markdown.matchAll(/https:\/\/github\.com\/([^)\s#]+\/[^)\s/#]+)/gi)].map(
    (match) => match[1]
  );
}

describe('marketplace metadata guardrails', () => {
  it('keeps README preview assets aligned with the published GitHub repository metadata', () => {
    const packageJson = JSON.parse(read('package.json')) as PackageJson;
    const readmeZh = read('README.md');
    const readmeEn = read('README.en.md');
    const relativeImagePaths = [...findRelativeImagePaths(readmeZh), ...findRelativeImagePaths(readmeEn)];
    const readmeRepos = new Set([...findGithubRepos(readmeZh), ...findGithubRepos(readmeEn)]);

    expect(relativeImagePaths).toEqual(expect.arrayContaining(['images/img1.png', 'images/img2.png']));

    for (const relativeImagePath of relativeImagePaths) {
      expect(fs.existsSync(path.join(projectRoot, relativeImagePath))).toBe(true);
    }

    expect(readmeRepos.size).toBe(1);

    const [canonicalRepo] = [...readmeRepos];

    expect(normalizeGithubRepo(packageJson.repository.url)).toBe(canonicalRepo);
    expect(normalizeGithubRepo(packageJson.homepage)).toBe(canonicalRepo);
    expect(normalizeGithubRepo(packageJson.bugs.url)).toBe(canonicalRepo);
  });
});
