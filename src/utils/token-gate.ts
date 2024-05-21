import { Address, BigInt, log } from '@graphprotocol/graph-ts'

import { ensureAsset } from '../utils/asset'

import { Raffl__tokenGatesResult, Raffl as RafflContract } from '../types/templates/Raffl/Raffl'
import { TokenGate } from '../types/schema'

function tokenGateId(raffle: Address, tokenGateIndex: i32): string {
  return `${raffle.toHexString()}/${tokenGateIndex}`
}

function addTokenGate(raffle: Address, tokenGateValue: Raffl__tokenGatesResult, tokenGateIndex: i32): TokenGate {
  // 1. Create TokenGate
  const tokenGate = new TokenGate(tokenGateId(raffle, tokenGateIndex))

  // 2. Get Asset
  const asset = ensureAsset(tokenGateValue.getToken(), 666)

  // 3. Set TokenGate properties
  tokenGate.raffle = raffle
  tokenGate.asset = asset.id
  tokenGate.value = tokenGateValue.getAmount()

  // 4. Save TokenGate
  tokenGate.save()

  return tokenGate
}

export function setTokenGate(raffleAddress: Address): void {
  // Add current token gates
  const contract = RafflContract.bind(raffleAddress)

  let i = 0
  let finished = false
  log.warning('Checking token gates! {}', [raffleAddress.toHexString()])
  while (!finished) {
    const tokenGatesCall = contract.try_tokenGates(BigInt.fromI32(i))
    if (tokenGatesCall.reverted || tokenGatesCall.value.getToken().equals(Address.zero())) {
      finished = true
    } else {
      addTokenGate(raffleAddress, tokenGatesCall.value, i)
      i++
    }
  }
}
