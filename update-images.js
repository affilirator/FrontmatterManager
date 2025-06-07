const fs = require("fs").promises;
const path = require("path");

async function processDirectory(dir) {
  const files = await fs.readdir(dir);
  const mdFiles = files.filter((file) => file.endsWith(".md"));
  for (const file of mdFiles) {
    const filePath = path.join(dir, file);
    await processFile(filePath);
  }
}

async function processFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = content.match(frontmatterRegex);
    if (match) {
      const frontmatterYaml = match[1];
      const frontmatterLines = frontmatterYaml.split("\n");
      let modified = false;
      for (let i = 0; i < frontmatterLines.length; i++) {
        if (frontmatterLines[i].startsWith("authorBio:")) {
          const value = frontmatterLines[i].substring("authorBio:".length).trim();
          if (
            value.includes("Patrick has transformed Golf Pitches") ||
            value.includes("golf enthusiast and the chief editor at Golf Pitches")
          ) {
            const newValue = value.replace(
              "Patrick Mahinge is a golf enthusiast and the chief editor at Golf Pitches, a website that delivers innovative and data - driven golf product reviews.With a keen eye for detail and a passion for the sport, Patrick has transformed Golf Pitches into a trusted source of information for golfers worldwide.",
              "Patrick Mahinge is a seasoned forex trader and market analyst with over 15 years of experience in the financial markets. As a Chartered Market Technician (CMT), he combines technical analysis with fundamental research to provide actionable trading insights."
            );
            frontmatterLines[i] = "authorBio: " + newValue;
            modified = true;
          }
        }
      }
      if (modified) {
        const newFrontmatterYaml = frontmatterLines.join("\n");
        const newFrontmatter = "---\n" + newFrontmatterYaml + "\n---\n";
        const newContent = content.replace(frontmatterRegex, newFrontmatter);
        await fs.writeFile(filePath, newContent, "utf8");
        console.log(`Updated ${filePath}`);
      }
    }
  } catch (e) {
    console.error(`Error processing ${filePath}:`, e);
  }
}

const dir = process.argv[2];
if (!dir) {
  console.error("Please provide a directory path");
  process.exit(1);
}

processDirectory(dir).catch((e) => console.error(e));
