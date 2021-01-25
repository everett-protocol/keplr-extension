import { ObservableChainQuery } from "../chain-query";
import { KVStore } from "@keplr/common";
import { ChainGetter } from "../../common/types";
import { ObservableQuerySecretContractCodeHash } from "./contract-hash";
import { autorun, computed, observable } from "mobx";
import { actionAsync, task } from "mobx-utils";
import { AccountStore } from "../../account";
import { Keplr } from "@keplr/types";
import { CancelToken } from "axios";
import { QueryResponse } from "../../common";

import { Buffer } from "buffer/";

export class ObservableSecretContractChainQuery<
  T
> extends ObservableChainQuery<T> {
  @observable.ref
  protected keplr?: Keplr;

  protected nonce?: Uint8Array;

  constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    protected readonly contractAddress: string,
    // eslint-disable-next-line @typescript-eslint/ban-types
    protected readonly obj: object,
    protected readonly querySecretContractCodeHash: ObservableQuerySecretContractCodeHash
  ) {
    // Don't need to set the url initially because it can't request without encyption.
    super(kvStore, chainId, chainGetter, ``);

    if (!this.contractAddress) {
      this.setError({
        status: 0,
        statusText: "Contract address is empty",
        message: "Contract address is empty",
      });
    }

    // Try to get the keplr API.
    this.initKeplr();

    const disposer = autorun(() => {
      // If the keplr API is ready and the contract code hash is fetched, try to init.
      if (this.keplr && this.contractCodeHash) {
        this.init();
        disposer();
      }
    });
  }

  protected canFetch(): boolean {
    if (
      !this.querySecretContractCodeHash.getQueryContract(this.contractAddress)
        .response
    ) {
      return false;
    }

    return this.contractAddress.length !== 0 && this.nonce != null;
  }

  @actionAsync
  protected async initKeplr() {
    this.keplr = await task(AccountStore.getKeplr());
  }

  @actionAsync
  protected async init() {
    if (this.keplr && this.contractCodeHash) {
      const enigmaUtils = this.keplr.getEnigmaUtils(this.chainId);
      const encrypted = await task(
        enigmaUtils.encrypt(this.contractCodeHash, this.obj)
      );
      this.nonce = encrypted.slice(0, 32);

      const encoded = Buffer.from(
        Buffer.from(encrypted).toString("base64")
      ).toString("hex");

      this.setUrl(
        `/wasm/contract/${this.contractAddress}/query/${encoded}?encoding=hex`
      );
    }
  }

  protected async fetchResponse(
    cancelToken: CancelToken
  ): Promise<QueryResponse<T>> {
    const response = await super.fetchResponse(cancelToken);

    const encResult = (response.data as unknown) as
      | {
          height: string;
          result: {
            smart: string;
          };
        }
      | undefined;

    if (!this.keplr) {
      throw new Error("Keplr API not initialized");
    }

    if (!this.nonce) {
      throw new Error("Nonce is unknown");
    }

    if (!encResult) {
      throw new Error("Failed to get the response from the contract");
    }

    const decrypted = await this.keplr
      .getEnigmaUtils(this.chainId)
      .decrypt(Buffer.from(encResult.result.smart, "base64"), this.nonce);

    const message = Buffer.from(
      Buffer.from(decrypted).toString(),
      "base64"
    ).toString();

    const obj = JSON.parse(message);
    return {
      data: obj as T,
      status: response.status,
      staled: false,
      timestamp: Date.now(),
    };
  }

  // Actually, the url of fetching the secret20 balance will be changed every time.
  // So, we should save it with deterministic key.
  protected getCacheKey(): string {
    return `${this.instance.name}-${
      this.instance.defaults.baseURL
    }${this.instance.getUri({
      url: `/wasm/contract/${this.contractAddress}/query/${JSON.stringify(
        this.obj
      )}?encoding=json`,
    })}`;
  }

  @computed
  get contractCodeHash(): string | undefined {
    const queryCodeHash = this.querySecretContractCodeHash.getQueryContract(
      this.contractAddress
    );

    if (!queryCodeHash.response) {
      return undefined;
    }

    // Code hash is persistent, so it is safe not to consider that the response is from cache or network.
    // TODO: Handle the error case.
    return queryCodeHash.response.data.result;
  }
}