import { OutputBlockData, OutputData } from "@editorjs/editorjs";
import edjsHtml from "editorjs-html";

type TableBlock = OutputBlockData<
  "table",
  {
    withHeadings: boolean;
    content: string[][];
  }
>;

type EmbedBlock = OutputBlockData<
  "embed",
  {
    service: "youtube" | "twitter" | "facebook" | "instagram";
    source: string;
    embed: string;
    width: number;
    height: number;
    caption: string;
  }
>;

export class EditorJsRenderer {
  private edjsParser: any;

  constructor() {
    this.edjsParser = edjsHtml({
      delimiter: this.renderDelimiter,
      table: this.renderTable,
      embed: this.renderEmbed,
    });
  }

  public renderToHtml(data: OutputData): string {
    // @todo this seems to be an issue with a post creation, requires monitoring
    if (!data.blocks) {
      return "<p>Corrupted or empty post</p>";
    }

    return this.edjsParser.parse(data).join("");
  }

  private renderDelimiter() {
    return '<div class="ejs-delimiter-block">***</div>';
  }

  private renderTable(block: TableBlock) {
    const { withHeadings, content: rows } = block.data;
    let result = "";

    result += "<table class='ejs-table-block'>";
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      result += "<tr>";
      const isHeaderRow = withHeadings && rowIndex === 0;

      result += isHeaderRow ? "<thead>" : "";
      result += rows[rowIndex]
        .map(col => (isHeaderRow ? `<th>${col}</th>` : `<td>${col}</td>`))
        .join("");
      result += isHeaderRow ? "</thead>" : "";

      result += "</tr>";
    }
    result += "</table>";

    return result;
  }

  private renderEmbed(block: EmbedBlock) {
    const embed = block.data;

    const width = embed.width ? `width=${embed.width}` : "";
    const height = embed.height ? `height=${embed.height}` : "";
    const sizeFallback =
      width && height
        ? ""
        : "width: 100%; min-height: 500px; max-height: 1000px;";

    const iframe =
      `<iframe ${width} ${height} src="${embed.embed}" ` +
      `style="${sizeFallback}" ` +
      `allowfullscreen frameborder="0" scrolling="no" allowtransparency="true" ` +
      `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;

    const caption = embed.caption
      ? `<figcaption class="figure-caption">${embed.caption}</figcaption>`
      : "";

    return (
      `<figure class="figure ejs-embed-block">` + iframe + caption + `</figure>`
    );
  }

  private renderDebug(block: any) {
    return `<pre>${JSON.stringify(block, null, 2)}</pre>`;
  }
}
