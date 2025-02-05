const {randomBytes} = require('crypto');

const {isLnd} = require('./../../lnd_requests');
const subscribeToPay = require('./subscribe_to_pay');

const defaultCltvDelta = 40;
const isPublicKey = n => !!n && /^[0-9A-F]{66}$/i.test(n);
const method = 'sendPaymentV2';
const randomId = () => randomBytes(32).toString('hex');
const type = 'router';

/** Subscribe to the status of a new payment

  Requires `offchain:write` permission

  `payment` is not supported on LND 0.11.1 and below

  `max_path_mtokens` is not supported in LND 0.12.0 or below

  Preferred `confidence` is not supported on LND 0.14.3 and below

  {
    [cltv_delta]: <Final CLTV Delta Number>
    [confidence]: <Preferred Route Confidence Number Out of One Million Number>
    destination: <Destination Public Key String>
    [features]: [{
      bit: <Feature Bit Number>
    }]
    [id]: <Payment Request Hash Hex String>
    [incoming_peer]: <Pay Through Specific Final Hop Public Key Hex String>
    lnd: <Authenticated LND API Object>
    [max_fee]: <Maximum Fee Tokens To Pay Number>
    [max_fee_mtokens]: <Maximum Fee Millitokens to Pay String>
    [max_path_mtokens]: <Maximum Millitokens For A Multi-Path Path String>
    [max_paths]: <Maximum Simultaneous Paths Number>
    [max_timeout_height]: <Maximum Height of Payment Timeout Number>
    [messages]: [{
      type: <Message Type Number String>
      value: <Message Raw Value Hex Encoded String>
    }]
    [mtokens]: <Millitokens to Pay String>
    [outgoing_channel]: <Pay Out of Outgoing Channel Id String>
    [outgoing_channels]: [<Pay Out of Outgoing Channel Ids String>]
    [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
    [payment]: <Payment Identifier Hex String>
    [routes]: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    [tokens]: <Tokens to Pay Number>
  }

  @throws
  <Error>

  @returns
  <Subscription EventEmitter Object>

  @event 'confirmed'
  {
    confirmed_at: <Payment Confirmed At ISO 8601 Date String>
    fee: <Total Fee Tokens Paid Rounded Down Number>
    fee_mtokens: <Total Fee Millitokens Paid String>
    hops: [{
      channel: <First Route Standard Format Channel Id String>
      channel_capacity: <First Route Channel Capacity Tokens Number>
      fee: <First Route Fee Tokens Rounded Down Number>
      fee_mtokens: <First Route Fee Millitokens String>
      forward_mtokens: <First Route Forward Millitokens String>
      public_key: <First Route Public Key Hex String>
      timeout: <First Route Timeout Block Height Number>
    }]
    id: <Payment Hash Hex String>
    mtokens: <Total Millitokens Paid String>
    paths: [{
      fee_mtokens: <Total Fee Millitokens Paid String>
      hops: [{
        channel: <First Route Standard Format Channel Id String>
        channel_capacity: <First Route Channel Capacity Tokens Number>
        fee: <First Route Fee Tokens Rounded Down Number>
        fee_mtokens: <First Route Fee Millitokens String>
        forward_mtokens: <First Route Forward Millitokens String>
        public_key: <First Route Public Key Hex String>
        timeout: <First Route Timeout Block Height Number>
      }]
      mtokens: <Total Millitokens Paid String>
    }]
    safe_fee: <Total Fee Tokens Paid Rounded Up Number>
    safe_tokens: <Total Tokens Paid, Rounded Up Number>
    secret: <Payment Preimage Hex String>
    timeout: <Expiration Block Height Number>
    tokens: <Total Tokens Paid Rounded Down Number>
  }

  @event 'failed'
  {
    is_insufficient_balance: <Failed Due To Lack of Balance Bool>
    is_invalid_payment: <Failed Due to Invalid Payment Bool>
    is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
    is_route_not_found: <Failed Due to Route Not Found Bool>
    [route]: {
      fee: <Route Total Fee Tokens Rounded Down Number>
      fee_mtokens: <Route Total Fee Millitokens String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Hop Forwarding Fee Rounded Down Tokens Number>
        fee_mtokens: <Hop Forwarding Fee Millitokens String>
        forward: <Hop Forwarding Tokens Rounded Down Number>
        forward_mtokens: <Hop Forwarding Millitokens String>
        public_key: <Hop Sending To Public Key Hex String>
        timeout: <Hop CTLV Expiration Height Number>
      }]
      mtokens: <Payment Sending Millitokens String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Sending Tokens Rounded Up Number>
      timeout: <Payment CLTV Expiration Height Number>
      tokens: <Payment Sending Tokens Rounded Down Number>
    }
  }

  @event 'paying'
  {
    created_at: <Payment Created At ISO 8601 Date String>
    destination: <Payment Destination Hex String>
    id: <Payment Hash Hex String>
    mtokens: <Total Millitokens Pending String>
    paths: [{
      fee: <Total Fee Tokens Pending Number>
      fee_mtokens: <Total Fee Millitokens Pending String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Tokens Rounded Down Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      mtokens: <Total Millitokens Pending String>
      safe_fee: <Total Fee Tokens Pending Rounded Up Number>
      safe_tokens: <Total Tokens Pending, Rounded Up Number>
      timeout: <Expiration Block Height Number>
    }]
    safe_tokens: <Total Tokens Pending, Rounded Up Number>
    [timeout]: <Expiration Block Height Number>
    tokens: <Total Tokens Pending Rounded Down Number>
  }

  @event 'routing_failure'
  {
    [channel]: <Standard Format Channel Id String>
    index: <Failure Index Number>
    [mtokens]: <Millitokens String>
    [public_key]: <Public Key Hex String>
    reason: <Failure Reason String>
    route: {
      fee: <Total Route Fee Tokens To Pay Number>
      fee_mtokens: <Total Route Fee Millitokens To Pay String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      mtokens: <Total Route Millitokens String>
      [payment]: <Payment Identifier Hex String>
      timeout: <Expiration Block Height Number>
      tokens: <Total Route Tokens Number>
      [total_mtokens]: <Total Millitokens String>
    }
  }
*/
module.exports = args => {
  if (!isPublicKey(args.destination)) {
    throw new Error('ExpectedDestinationWhenPayingViaDetails');
  }

  if (!isLnd({method, type, lnd: args.lnd})) {
    throw new Error('ExpectedAuthenticatedLndToSubscribeToPayViaDetails');
  }

  if ((!args.tokens && !args.mtokens) && !args.request) {
    throw new Error('ExpectedTokenAmountToPayInPaymentDetails');
  }

  return subscribeToPay({
    cltv_delta: args.cltv_delta || defaultCltvDelta,
    confidence: args.confidence,
    destination: args.destination,
    features: args.features,
    id: args.id || randomId(),
    incoming_peer: args.incoming_peer,
    lnd: args.lnd,
    max_fee: args.max_fee,
    max_fee_mtokens: args.max_fee_mtokens,
    max_path_mtokens: args.max_path_mtokens,
    max_paths: args.max_paths,
    max_timeout_height: args.max_timeout_height,
    messages: args.messages,
    mtokens: args.mtokens,
    outgoing_channel: args.outgoing_channel,
    pathfinding_timeout: args.pathfinding_timeout,
    payment: args.payment,
    routes: args.routes,
    tokens: args.tokens,
  });
};
