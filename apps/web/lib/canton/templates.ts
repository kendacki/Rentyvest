import * as jtv from '@mojotech/json-type-validation';
import type { Choice, ContractId, Template } from '@daml/types';

/** Placeholder payload — full shape comes from `npm run generate-daml`. */
export type PropertyPoolPayload = Record<string, never>;

export type PledgeChoiceArgument = {
  buyer: string;
  slot_count: number;
  meta_uri: string;
  paymentAssetCid: string;
};

const DEFAULT_PROPERTY_POOL_TEMPLATE_ID = 'RentyVest.PropertyPool:PropertyPool';

export function getPropertyPoolTemplateId(): string {
  return (
    process.env.NEXT_PUBLIC_CANTON_TEMPLATE_PROPERTY_POOL ??
    DEFAULT_PROPERTY_POOL_TEMPLATE_ID
  );
}

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

export const PropertyPool = {
  template: propertyPoolTemplate,
  Pledge: createPledgeChoice(propertyPoolTemplate),
} as const;

export function asPropertyPoolContractId(
  contractId: string,
): ContractId<PropertyPoolPayload> {
  return contractId as ContractId<PropertyPoolPayload>;
}
