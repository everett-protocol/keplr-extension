import React, { FunctionComponent } from "react";

import { observer } from "mobx-react";
import { useStore } from "../../stores";

import styleDetailsTab from "./details-tab.module.scss";

import { renderMessage } from "./messages";
import { FormattedMessage, useIntl } from "react-intl";
import { FeeButtons, MemoInput } from "../../components/form";
import { IFeeConfig, IMemoConfig, SignDocHelper } from "@keplr/hooks";
import { useLanguage } from "../../languages";
import { Label } from "reactstrap";

export const DetailsTab: FunctionComponent<{
  signDocHelper: SignDocHelper;
  memoConfig: IMemoConfig;
  feeConfig: IFeeConfig;

  hideFeeButtons: boolean | undefined;
}> = observer(({ signDocHelper, memoConfig, feeConfig, hideFeeButtons }) => {
  const { chainStore, priceStore } = useStore();
  const intl = useIntl();

  const language = useLanguage();

  return (
    <div className={styleDetailsTab.container}>
      <Label for="signing-messages" className="form-control-label">
        <FormattedMessage id="sign.list.messages.label" />
      </Label>
      <div id="signing-messages" className={styleDetailsTab.msgContainer}>
        {signDocHelper.msgs.map((msg, i) => {
          const msgContent = renderMessage(
            msg,
            chainStore.current.currencies,
            intl
          );
          return (
            <React.Fragment key={i.toString()}>
              <Msg icon={msgContent.icon} title={msgContent.title}>
                {msgContent.content}
              </Msg>
              <hr />
            </React.Fragment>
          );
        })}
      </div>
      <MemoInput
        memoConfig={memoConfig}
        label={intl.formatMessage({ id: "sign.info.memo" })}
        rows={1}
      />
      {!hideFeeButtons ? (
        <FeeButtons
          feeConfig={feeConfig}
          priceStore={priceStore}
          label={intl.formatMessage({ id: "sign.info.fee" })}
        />
      ) : feeConfig.fee ? (
        <React.Fragment>
          <Label for="fee-price" className="form-control-label">
            <FormattedMessage id="sign.info.fee" />
          </Label>
          <div id="fee-price">
            <div>
              {feeConfig.fee.maxDecimals(6).trim(true).toString()}
              {priceStore.calculatePrice(
                language.fiatCurrency,
                feeConfig.fee
              ) ? (
                <div
                  className="ml-2"
                  style={{ display: "inline-block", fontSize: "12px" }}
                >
                  {priceStore
                    .calculatePrice(language.fiatCurrency, feeConfig.fee)
                    ?.toString()}
                </div>
              ) : null}
            </div>
          </div>
        </React.Fragment>
      ) : null}
    </div>
  );
});

const Msg: FunctionComponent<{
  icon?: string;
  title: string;
}> = ({ icon = "fas fa-question", title, children }) => {
  return (
    <div className={styleDetailsTab.msg}>
      <div className={styleDetailsTab.icon}>
        <div style={{ height: "2px" }} />
        <i className={icon} />
        <div style={{ flex: 1 }} />
      </div>
      <div className={styleDetailsTab.contentContainer}>
        <div className={styleDetailsTab.contentTitle}>{title}</div>
        <div className={styleDetailsTab.content}>{children}</div>
      </div>
    </div>
  );
};
