import {
  ObservableChainQuery,
  ObservableChainQueryMap,
} from "../../chain-query";
import { KVStore } from "@keplr/common";
import { ChainGetter } from "../../../common";
import { AuthAccount } from "./types";
import { computed, makeObservable } from "mobx";
import { BaseAccount } from "@keplr/cosmos";

export class ObservableQueryAccountInner extends ObservableChainQuery<AuthAccount> {
  constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    protected readonly bech32Address: string
  ) {
    super(kvStore, chainId, chainGetter, `/auth/accounts/${bech32Address}`);

    makeObservable(this);
  }

  @computed
  get sequence(): string {
    if (!this.response) {
      return "0";
    }

    const account = BaseAccount.fromAminoJSON(
      this.response.data,
      this.bech32Address
    );
    return account.getSequence().toString();
  }
}

export class ObservableQueryAccount extends ObservableChainQueryMap<AuthAccount> {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter
  ) {
    super(kvStore, chainId, chainGetter, (bech32Address) => {
      return new ObservableQueryAccountInner(
        this.kvStore,
        this.chainId,
        this.chainGetter,
        bech32Address
      );
    });
  }

  getQueryBech32Address(bech32Address: string): ObservableQueryAccountInner {
    return this.get(bech32Address) as ObservableQueryAccountInner;
  }
}
