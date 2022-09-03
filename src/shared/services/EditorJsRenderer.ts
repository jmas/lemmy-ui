import { OutputBlockData, OutputData } from "@editorjs/editorjs";
import edjsHtml from "editorjs-html";

type TableBlock = OutputBlockData<
  "table",
  {
    withHeadings: boolean;
    content: string[][];
  }
>;

export class EditorJsRenderer {
  private edjsParser: any;

  constructor() {
    this.edjsParser = edjsHtml({
      delimiter: this.renderDelimiter,
      table: this.renderTable,
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
    return '<div class="delimiter">***</div>';
  }

  private renderTable(block: TableBlock) {
    const { withHeadings, content: rows } = block.data;
    let result = "";

    result += "<table>";
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      result += "<tr>";

      result += rows[rowIndex]
        .map(col => {
          if (withHeadings && rowIndex === 0) {
            return `<th>${col}</th>`;
          }

          return `<td>${col}</td>`;
        })
        .join("");

      result += "</tr>";
    }
    result += "</table>";

    return result;
  }
}
