import Code from "@editorjs/code";
import Delimiter from "@editorjs/delimiter";
import EditorJS, { OutputData } from "@editorjs/editorjs";
import Embed from "@editorjs/embed";
import Header from "@editorjs/header";
import ImageTool from "@editorjs/image";
import List from "@editorjs/list";
import Quote from "@editorjs/quote";
import Table from "@editorjs/table";
import { Option } from "@sniptt/monads";
import LinkWithTarget from "editorjs-link-with-target";
import { i18n } from "../i18next";
import { toast } from "../utils";

interface Options {
  holderId: string | HTMLElement;
  content: Option<OutputData>;
  placeholder: Option<string>;
  disabled?: boolean;
  onImageUpload: (file: any) => Promise<string>;
  onChange: (content: OutputData) => void;
}

export class EditorJs {
  instance: any;

  constructor(options: Options) {
    const editorJs = new EditorJS({
      data: options.content.unwrapOr({ blocks: [] }),
      autofocus: true,
      placeholder: options.placeholder.unwrapOr(""),
      readOnly: options.disabled,
      tools: {
        code: Code,
        delimiter: Delimiter,
        embed: {
          class: Embed,
          config: {
            services: {
              youtube: true,
              twitter: true,
              facebook: true,
              instagram: true,
            },
          },
        },
        header: Header,
        link: LinkWithTarget,
        list: List,
        quote: {
          class: Quote,
          config: {
            quotePlaceholder: "Введіть цитату", // enter_quote
            captionPlaceholder: "Введіть заголовок", // enter_caption
          },
        },
        table: Table,
        image: {
          class: ImageTool,
          config: {
            uploader: {
              uploadByFile: async file => {
                try {
                  const url = await options.onImageUpload(file);

                  return {
                    success: 1,
                    file: {
                      url,
                    },
                  };
                } catch (e) {
                  console.error(e);
                  toast(e, "danger");

                  return null;
                }
              },
            },
          },
        },
      },
      i18n: {
        messages: {
          ui: {
            blockTunes: {
              toggler: {
                "Click to tune": "Натисніть для налаштування", // click_to_tune
              },
            },
            inlineToolbar: {
              converter: {
                "Convert to": "Конвертувати в", // convert_to
              },
            },
            toolbar: {
              toolbox: {
                Add: "Додати", // add
                Filter: "Фільтр", // filter
              },
            },
          },
          toolNames: {
            Text: "Текст", // text
            Code: i18n.t("code"),
            Delimiter: "Розділювач", // delimiter
            Embed: "Вбудовано", // embed
            Heading: i18n.t("header"),
            Link: i18n.t("link"),
            List: i18n.t("list"),
            Quote: i18n.t("quote"),
            Table: "Таблиця", // table
            Image: "Зображення", // image

            Bold: i18n.t("bold"),
            Italic: i18n.t("italic"),
          },
          tools: {
            link: {
              "Open in new window": "Відкрити в новому вікні", // open_in_new_window
              Save: i18n.t("save"),
              "Add a link": "Додати посилання", // add_link
            },
            embed: {
              "Enter a caption": "Введіть заголовок", // enter_caption
            },
            quote: {
              // not supported by plugin
              // 'Left alignment': 'За лівим краєм',
              // 'Center alignment': 'По центру',
            },
            table: {
              "With headings": "Із заголовком", // with_header
              "Without headings": "Без заголовку", // without_header
            },
            image: {
              "With border": "З рамкою", // with_border
              "Stretch image": "Розтягнути зображення", // stretch_image
              "With background": "З фоном", // with_background
            },
            list: {
              Unordered: "Маркерований", // unordered
              Ordered: "Нумерований", // ordered
            },
          },
          blockTunes: {
            delete: {
              Delete: i18n.t("remove"),
            },
            moveUp: {
              "Move up": "Підняти", // move_up
            },
            moveDown: {
              "Move down": "Опустити", // move_down
            },
          },
        },
      },
      holder: options.holderId,
      onReady: () => {
        this.instance = editorJs;
      },
      onChange: async () => {
        let content = await this.instance.saver.save();
        options.onChange(content);
      },
    });
  }

  public destroy() {
    this.instance.destroy();
  }
}
