import { Option } from "@sniptt/monads";
import { Component } from "inferno";
import { Helmet } from "inferno-helmet";
import { UserService } from "../../services";

interface Props {
  defaultTheme: Option<string>;
}

export class Theme extends Component<Props> {
  render() {
    return (
      <Helmet>
        {/* <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx"
        /> */}
        {/* <link
          rel="stylesheet"
          type="text/css"
          href="/css/themes/litely.css"
        /> */}
      </Helmet>
    );

    let user = UserService.Instance.myUserInfo;
    let hasTheme = false; /* user
      .map(m => m.local_user_view.local_user.theme !== "browser")
      .unwrapOr(false);*/

    if (hasTheme) {
      return (
        <Helmet>
          <link
            rel="stylesheet"
            type="text/css"
            href={`/css/themes/${
              user.unwrap().local_user_view.local_user.theme
            }.css`}
          />
        </Helmet>
      );
    } else if (
      this.props.defaultTheme.isSome() &&
      this.props.defaultTheme.unwrap() != "browser"
    ) {
      return (
        <Helmet>
          <link
            rel="stylesheet"
            type="text/css"
            href={`/css/themes/${this.props.defaultTheme.unwrap()}.css`}
          />
        </Helmet>
      );
    } else {
      return (
        <Helmet>
          <link
            rel="stylesheet"
            type="text/css"
            href="/css/themes/litely.css"
            id="default-light"
            media="(prefers-color-scheme: light)"
          />
          <link
            rel="stylesheet"
            type="text/css"
            href="/css/themes/darkly.css"
            id="default-dark"
            media="(prefers-color-scheme: no-preference), (prefers-color-scheme: dark)"
          />
        </Helmet>
      );
    }
  }
}
