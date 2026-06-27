import * as jtv from '@mojotech/json-type-validation';
import type { Choice, ContractId, Template } from '@daml/types';

import {
  getDefaultTokenSymbol,
  getPropertyPoolTemplateId,
  getUsdcAssetTemplateId,
} from './config';

/** Placeholder payload — full shape comes from `npm run generate-daml`. */
export type PropertyPoolPayload = Record<string, never>;

export type AssetPayload = {
  issuer: string;
  owner: string;
  amount: string;
  instrumentId: {
    admin: string;
    id: string;
  };
  lock: unknown | null;
  meta: unknown;
  observers: string[];
};

export type PledgeChoiceArgument = {
  buyer: string;
  slot_count: number;
  meta_uri: string;
  paymentAssetCid: string;
};

const assetPayloadDecoder = jtv.object({
  issuer: jtv.string(),
  owner: jtv.string(),
  amount: jtv.string(),
  instrumentId: jtv.object({
    admin: jtv.string(),
    id: jtv.string(),
  }),
  lock: jtv.unknownJson(),
  meta: jtv.unknownJson(),
  observers: jtv.array(jtv.string()),
}) as jtv.Decoder<AssetPayload>;

const propertyPoolDecoder = jtv.object({}) as jtv.Decoder<PropertyPoolPayload>;

function createPropertyPoolTemplate(
  templateId: string,
): Template<PropertyPoolPayload, unknown, string> {
  return {
    templateId,
    templateIdWithPackageId: templateId,
    componentVersionString: '3.5.2',
    decoder: propertyPoolDecoder,
    keyDecoder: jtv.unknownJson() as jtv.Decoder<unknown>,
    encode: (payload) => payload,
    keyEncode: () => null,
    Archive: {
      choiceName: 'Archive',
      template: () => createPropertyPoolTemplate(templateId),
      argumentDecoder: jtv.object({}),
      argumentEncode: () => ({}),
      resultDecoder: jtv.object({}),
    },
  };
}

function createAssetTemplate(
  templateId: string,
): Template<AssetPayload, unknown, string> {
  return {
    templateId,
    templateIdWithPackageId: templateId,
    componentVersionString: '3.5.2',
    decoder: assetPayloadDecoder,
    keyDecoder: jtv.unknownJson() as jtv.Decoder<unknown>,
    encode: (payload) => payload,
    keyEncode: () => null,
    Archive: {
      choiceName: 'Archive',
      template: () => createAssetTemplate(templateId),
      argumentDecoder: jtv.object({}),
      argumentEncode: () => ({}),
      resultDecoder: jtv.object({}),
    },
  };
}

const pledgeArgumentDecoder = jtv.object({
  buyer: jtv.string(),
  slot_count: jtv.number(),
  meta_uri: jtv.string(),
  paymentAssetCid: jtv.string(),
}) as jtv.Decoder<PledgeChoiceArgument>;

function createPledgeChoice(
  template: Template<PropertyPoolPayload, unknown, string>,
): Choice<PropertyPoolPayload, PledgeChoiceArgument, unknown> {
  return {
    choiceName: 'Pledge',
    template: () => template,
    argumentDecoder: pledgeArgumentDecoder,
    argumentEncode: (argument) => ({
      buyer: argument.buyer,
      slot_count: argument.slot_count,
      meta_uri: argument.meta_uri,
      paymentAssetCid: argument.paymentAssetCid,
    }),
    resultDecoder: jtv.unknownJson(),
  };
}

const propertyPoolTemplate = createPropertyPoolTemplate(getPropertyPoolTemplateId());
const assetTemplate = createAssetTemplate(getUsdcAssetTemplateId());

export const PropertyPool = {
  template: propertyPoolTemplate,
  Pledge: createPledgeChoice(propertyPoolTemplate),
} as const;

export const Asset = {
  template: assetTemplate,
  tokenSymbol: getDefaultTokenSymbol(),
} as const;

export function asPropertyPoolContractId(
  contractId: string,
): ContractId<PropertyPoolPayload> {
  return contractId as ContractId<PropertyPoolPayload>;
}
