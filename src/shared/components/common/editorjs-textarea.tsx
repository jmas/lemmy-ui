import {None, Option, Some} from "@sniptt/monads";
import autosize from "autosize";
import {Component, linkEvent} from "inferno";
import {Prompt} from "inferno-router";
import {toOption, toUndefined} from "lemmy-js-client";
import {pictrsUri} from "../../env";
import {i18n} from "../../i18next";
import {
    editorJsToHtml,
    isBrowser,
    markdownHelpUrl,
    pictrsDeleteToast,
    randomStr,
    relTags,
    toast,
} from "../../utils";
import {Icon, Spinner} from "./icon";
import {OutputData} from "@editorjs/editorjs";

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
    blocks: OutputData,
    previewMode: boolean;
    loading: boolean;
    imageLoading: boolean;
}

export class EditorJsTextArea extends Component<EditorJsTextAreaProps,
    EditorJsTextAreaState> {
    private id = `comment-textarea-${randomStr()}`;
    private formId = `comment-form-${randomStr()}`;
    // private tribute: any;
    private editorJsInstance: any = null;
    private emptyState: EditorJsTextAreaState = {
        content: this.props.initialContent,
        previewMode: false,
        loading: false,
        imageLoading: false,
    };

    constructor(props: any, context: any) {
        super(props, context);

        // if (isBrowser()) {
        //     this.tribute = setupTribute();
        // }

        this.state = this.emptyState;
    }

    componentDidMount() {
        let textarea: any = document.getElementById(this.id);
        if (textarea && isBrowser()) {
            const editorJs = new window.EditorJS({
                data: this.state.content.match({
                    some: content => content,
                    none: ({blocks: []}),
                }),
                autofocus: true,
                tools: {
                    code: window.CodeTool,
                    delimiter: window.Delimiter,
                    embed: {
                        class: window.Embed,
                        config: {
                            services: {
                                youtube: true,
                                facebook: true,
                                instagram: true,
                                twitter: true,
                            }
                        },
                        inlineToolbar: true
                    },
                    header: window.Header,
                    link: window.LinkTool,
                    list: window.List,
                    quote: window.Quote,
                    table: window.Table,
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
                }
            })

            // autosize(textarea);
            // this.tribute.attach(textarea);
            // textarea.addEventListener("tribute-replaced", () => {
            //     this.state.content = Some(textarea.value);
            //     this.setState(this.state);
            //     autosize.update(textarea);
            // });
            //
            // this.quoteInsert();
            //
            // if (this.props.focus) {
            //     textarea.focus();
            // }
            //
            // TODO this is slow for some reason
            // setupTippy();
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
                            style={{height: 'auto'}}
                            className={`form-control ${this.state.previewMode && "d-none"}`}
                            // value={toUndefined(this.state.content)}
                            // onInput={linkEvent(this, this.handleContentChange)}
                            // onPaste={linkEvent(this, this.handleImageUploadPaste)}
                            // required
                            // disabled={this.props.disabled}
                            // rows={2}
                            // maxLength={this.props.maxLength.unwrapOr(10000)}
                            // placeholder={toUndefined(this.props.placeholder)}
                        />
                        {this.state.previewMode &&
                            this.state.content.match({
                                some: content => (
                                    <div>
                                        <div
                                            className="card border-secondary card-body md-div"
                                            dangerouslySetInnerHTML={editorJsToHtml(JSON.stringify(content))}
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

    handleImageUploadPaste(i: EditorJsTextArea, event: any) {
        let image = event.clipboardData.files[0];
        if (image) {
            i.handleImageUpload(i, image);
        }
    }

    handleImageUpload(i: EditorJsTextArea, event: any) {
        let file: any;
        if (event.target) {
            event.preventDefault();
            file = event.target.files[0];
        } else {
            file = event;
        }

        const formData = new FormData();
        formData.append("images[]", file);

        i.state.imageLoading = true;
        i.setState(i.state);

        fetch(pictrsUri, {
            method: "POST",
            body: formData,
        })
            .then(res => res.json())
            .then(res => {
                console.log("pictrs upload:");
                console.log(res);
                if (res.msg == "ok") {
                    let hash = res.files[0].file;
                    let url = `${pictrsUri}/${hash}`;
                    let deleteToken = res.files[0].delete_token;
                    let deleteUrl = `${pictrsUri}/delete/${deleteToken}/${hash}`;
                    let imageMarkdown = `![](${url})`;
                    i.state.content = Some(
                        i.state.content.match({
                            some: content => `${content}\n${imageMarkdown}`,
                            none: imageMarkdown,
                        })
                    );
                    i.state.imageLoading = false;
                    i.contentChange();
                    i.setState(i.state);
                    let textarea: any = document.getElementById(i.id);
                    autosize.update(textarea);
                    pictrsDeleteToast(
                        i18n.t("click_to_delete_picture"),
                        i18n.t("picture_deleted"),
                        deleteUrl
                    );
                } else {
                    i.state.imageLoading = false;
                    i.setState(i.state);
                    toast(JSON.stringify(res), "danger");
                }
            })
            .catch(error => {
                i.state.imageLoading = false;
                i.setState(i.state);
                console.error(error);
                toast(error, "danger");
            });
    }

    contentChange() {
        if (this.props.onContentChange) {
            this.props.onContentChange(`__editor_type:editorjs:${JSON.stringify(this.state.content)}`);
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
        let msg = {val: toUndefined(i.state.content), formId: i.formId};
        i.props.onSubmit(msg);
    }

    handleReplyCancel(i: EditorJsTextArea) {
        i.props.onReplyCancel();
    }
}
