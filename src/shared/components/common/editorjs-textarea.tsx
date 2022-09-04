import { OutputData } from "@editorjs/editorjs";
import { None, Option, Some } from "@sniptt/monads";
import autosize from "autosize";
import { Component, linkEvent } from "inferno";
import { Prompt } from "inferno-router";
import { toOption } from "lemmy-js-client";
import { pictrsUri } from "../../env";
import { i18n } from "../../i18next";
import { EditorJs } from "../../services/EditorJs";
import {
  addEditorJsMarker,
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
  private editorJs: any = null;
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
      this.editorJs = new EditorJs({
        holderId: this.id,
        content: this.state.content,
        disabled: this.props.disabled,
        placeholder: this.props.placeholder,
        onImageUpload: this.uploadImage,
        onChange: async content => {
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
    if (this.editorJs) {
      this.editorJs.destroy();
      this.editorJs = null;
    }
    window.onbeforeunload = null;
  }

  render() {
    return (
      <form id={this.formId} onSubmit={linkEvent(this, this.handleSubmit)}>
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
        addEditorJsMarker(this.state.content.unwrapOr({ blocks: [] }))
      );
    }
  }

  handlePreviewToggle(i: EditorJsTextArea, event: any) {
    event.preventDefault();
    i.state.previewMode = !i.state.previewMode;
    i.setState(i.state);
  }

  handleSubmit(i: EditorJsTextArea, event: any) {
    event.preventDefault();
    i.state.loading = true;
    i.setState(i.state);

    let msg = {
      val: addEditorJsMarker(i.state.content.unwrapOr({ blocks: [] })),
      formId: i.formId,
    };

    i.props.onSubmit(msg);
  }

  handleReplyCancel(i: EditorJsTextArea) {
    i.props.onReplyCancel();
  }
}
