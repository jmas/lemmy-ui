import Code from "@editorjs/code";
import Delimiter from "@editorjs/delimiter";
import EditorJS, { OutputData } from "@editorjs/editorjs";
import Embed from "@editorjs/embed";
import Header from "@editorjs/header";
import ImageTool from "@editorjs/image";
import List from "@editorjs/list";
import Quote from "@editorjs/quote";
import Table from "@editorjs/table";
import { None, Option, Some } from "@sniptt/monads";
import autosize from "autosize";
import LinkWithTarget from "editorjs-link-with-target";
import { Component, linkEvent } from "inferno";
import { Prompt } from "inferno-router";
import { toOption, toUndefined } from "lemmy-js-client";
import { pictrsUri } from "../../env";
import { i18n } from "../../i18next";
import {
  editorJsToHtml,
  isBrowser,
  markdownHelpUrl,
  randomStr,
  relTags,
  setupTribute,
  toast,
} from "../../utils";
import { Icon, Spinner } from "./icon";

interface EditorJsTextAreaProps {
  initialContent: Option<OutputData>;
  placeholder: Option<string>;
  buttonTitle: Option<string>;
  maxLength: Option<number>;
  replyType?: boolean;
  focus?: boolean;
  disabled?: boolean;
  finished?: boolean;
  hideNavigationWarnings?: boolean;

  onContentChange?(val: string): any;

  onReplyCancel?(): any;

  onSubmit?(msg: { val: string; formId: string }): any;
}

interface EditorJsTextAreaState {
  content: Option<OutputData>;
  previewMode: boolean;
  loading: boolean;
  imageLoading: boolean;
}

export class EditorJsTextArea extends Component<
  EditorJsTextAreaProps,
  EditorJsTextAreaState
> {
  private id = `comment-textarea-${randomStr()}`;
  private formId = `comment-form-${randomStr()}`;
  private tribute: any;
  private editorJsInstance: any = null;
  private emptyState: EditorJsTextAreaState = {
    content: this.props.initialContent,
    previewMode: false,
    loading: false,
    imageLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    if (isBrowser()) {
      this.tribute = setupTribute(true);
    }

    this.state = this.emptyState;
  }

  componentDidMount() {
    let textarea: any = document.getElementById(this.id);
    if (textarea && isBrowser()) {
      const editorJs = new EditorJS({
        data: this.state.content.unwrapOr({ blocks: [] }),
        autofocus: true,
        placeholder: toUndefined(this.props.placeholder),
        readOnly: this.props.disabled,
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
                    const url = await this.uploadImage(file);

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
        holder: this.id,
        onReady: () => {
          this.editorJsInstance = editorJs;
        },
        onChange: async () => {
          let content = await this.editorJsInstance.saver.save();
          this.state.content = toOption(content);
          this.contentChange();
          this.setState(this.state);
        },
      });

      this.tribute.attach(textarea);
      textarea.addEventListener("tribute-replaced", () => {
        this.state.content = Some(textarea.value);
        this.setState(this.state);
        autosize.update(textarea);
      });
    }
  }

  componentDidUpdate() {
    if (!this.props.hideNavigationWarnings && this.state.content.isSome()) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = undefined;
    }
  }

  componentWillReceiveProps(nextProps: EditorJsTextAreaProps) {
    if (nextProps.finished) {
      this.state.previewMode = false;
      this.state.loading = false;
      this.state.content = None;
      this.setState(this.state);
      if (this.props.replyType) {
        this.props.onReplyCancel();
      }

      let textarea: any = document.getElementById(this.id);
      let form: any = document.getElementById(this.formId);
      form.reset();
      setTimeout(() => autosize.update(textarea), 10);
      this.setState(this.state);
    }
  }

  componentWillUnmount() {
    if (this.editorJsInstance) {
      this.editorJsInstance.destroy();
      this.editorJsInstance = null;
    }
    window.onbeforeunload = null;
  }

  render() {
    return (
      <form id={this.formId}>
        <Prompt
          when={
            !this.props.hideNavigationWarnings && this.state.content.isSome()
          }
          message={i18n.t("block_leaving")}
        />
        <div class="form-group row">
          <div className={`col-sm-12`}>
            <div
              id={this.id}
              style={{ height: "auto" }}
              className={`form-control ${this.state.previewMode && "d-none"}`}
            />
            {this.state.previewMode &&
              this.state.content.match({
                some: content => (
                  <div>
                    <div
                      className="card border-secondary card-body md-div"
                      dangerouslySetInnerHTML={editorJsToHtml(
                        JSON.stringify(content)
                      )}
                    />
                  </div>
                ),
                none: <></>,
              })}
          </div>
          <label class="sr-only" htmlFor={this.id}>
            {i18n.t("body")}
          </label>
        </div>
        <div class="row">
          <div class="col-sm-12 d-flex flex-wrap">
            {this.props.buttonTitle.match({
              some: buttonTitle => (
                <button
                  type="submit"
                  class="btn btn-sm btn-secondary mr-2"
                  disabled={this.props.disabled || this.state.loading}
                >
                  {this.state.loading ? (
                    <Spinner />
                  ) : (
                    <span>{buttonTitle}</span>
                  )}
                </button>
              ),
              none: <></>,
            })}
            {this.props.replyType && (
              <button
                type="button"
                class="btn btn-sm btn-secondary mr-2"
                onClick={linkEvent(this, this.handleReplyCancel)}
              >
                {i18n.t("cancel")}
              </button>
            )}
            {this.state.content.isSome() && (
              <button
                className={`btn btn-sm btn-secondary mr-2 ${
                  this.state.previewMode && "active"
                }`}
                onClick={linkEvent(this, this.handlePreviewToggle)}
              >
                {i18n.t("preview")}
              </button>
            )}
            <a
              href={markdownHelpUrl}
              class="btn btn-sm text-muted font-weight-bold"
              title={i18n.t("formatting_help")}
              rel={relTags}
            >
              <Icon icon="help-circle" classes="icon-inline" />
            </a>
          </div>
        </div>
      </form>
    );
  }

  async uploadImage(file: any) {
    const formData = new FormData();
    formData.append("images[]", file);

    const response = await fetch(pictrsUri, {
      method: "POST",
      body: formData,
    }).then(response => response.json());

    console.log("pictrs upload:");
    console.log(response);

    if (response.msg != "ok") {
      toast(JSON.stringify(response), "danger");
      throw new Error("Image upload failed");
    }

    const hash = response.files[0].file;

    return `${pictrsUri}/${hash}`;
  }

  contentChange() {
    if (this.props.onContentChange) {
      this.props.onContentChange(
        `__editor_type:editorjs:${JSON.stringify(
          this.state.content.unwrapOr({ blocks: [] })
        )}`
      );
    }
  }

  handlePreviewToggle(i: EditorJsTextArea, event: any) {
    event.preventDefault();
    i.state.previewMode = !i.state.previewMode;
    i.setState(i.state);
  }

  handleReplyCancel(i: EditorJsTextArea) {
    i.props.onReplyCancel();
  }
}
