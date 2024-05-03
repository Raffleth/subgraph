import { Address, BigInt } from '@graphprotocol/graph-ts'

import { Raffl as RaflContract } from '../types/RafflFactory/Raffl'
import { RafflFactory as RafflFactoryContract } from '../types/RafflFactory/RafflFactory'

export function getRaffleCustomFee(raffleAddress: Address): BigInt | null {
  const raffleContract = RaflContract.bind(raffleAddress)

  const factory = raffleContract.try_factory()
  if (factory.reverted) return null

  const raffleFactoryContract = RafflFactoryContract.bind(factory.value)
  const globalFeeData = raffleFactoryContract.try_feeData()
  const raffleFeeData = raffleContract.try_feeData()
  if (globalFeeData.reverted || raffleFeeData.reverted) return null

  // Save RaffleCustomFee entity
  const enabled = globalFeeData.value.feePercentage.notEqual(raffleFeeData.value.feePercentage)

  return enabled ? raffleFeeData.value.feePercentage : null
}
