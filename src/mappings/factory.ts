import { Address, BigInt } from '@graphprotocol/graph-ts'

import { ERC721Metadata as ERC721MetadataContract } from '../types/RafflFactory/ERC721Metadata'
import { Raffl as RaflContract } from '../types/RafflFactory/Raffl'
import {
  FeeChanged as FeeChangedEvent,
  FeeCollectorChanged as FeeCollectorChangedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  OwnershipTransferRequested as OwnershipTransferRequestedEvent,
  RaffleCreated as RaffleCreatedEvent,
  RafflFactory as RafflFactoryContract,
  RafflFeeChanged as RafflFeeChangedEvent
} from '../types/RafflFactory/RafflFactory'
import {
  FeeCollectorChange,
  FeePercentageChange,
  OwnershipTransferred,
  OwnershipTransferRequested,
  Prize,
  Raffle,
  RaffleCreated,
  RaffleCustomFee
} from '../types/schema'
import { Raffl as NewRaffl } from '../types/templates'
import { ensureAsset } from '../utils/asset'
import { getRaffleCustomFee } from '../utils/fee'
import { setTokenGate } from '../utils/token-gate'
import { ensureUser } from '../utils/user'

export function handleFeeCollectorChange(event: FeeCollectorChangedEvent): void {
  const entity = new FeeCollectorChange(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.feeCollector = event.params.feeCollector

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFeePercentageChange(event: FeeChangedEvent): void {
  const entity = new FeePercentageChange(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.feePercentage = event.params.feePercentage
  entity.feePenality = event.params.feePenality

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRaffleCustomFeeChange(event: RafflFeeChangedEvent): void {
  const raffleFactoryContract = RafflFactoryContract.bind(event.address)
  const globalFeeData = raffleFactoryContract.try_feeData()
  const raffleContract = RaflContract.bind(event.params.raffle)
  const raffleFeeData = raffleContract.try_feeData()

  if (!globalFeeData.reverted && !raffleFeeData.reverted) {
    // Save RaffleCustomFee entity
    const entity = new RaffleCustomFee(event.transaction.hash.concatI32(event.logIndex.toI32()))
    entity.raffle = event.params.raffle
    const enabled = globalFeeData.value.feePercentage.notEqual(raffleFeeData.value.feePercentage)
    entity.enabled = enabled
    entity.feePercentage = raffleFeeData.value.feePercentage

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()

    // Update Raffle fee
    const raffle = Raffle.load(event.params.raffle)
    if (raffle) {
      raffle.customFee = enabled ? raffleFeeData.value.feePercentage : null
      raffle.save()
    }
  }
}

export function handleOwnershipTransferRequested(event: OwnershipTransferRequestedEvent): void {
  const entity = new OwnershipTransferRequested(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.previousOwner = event.params.from
  entity.newOwner = event.params.to

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {
  const entity = new OwnershipTransferred(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.previousOwner = event.params.from
  entity.newOwner = event.params.to

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRaffleCreated(event: RaffleCreatedEvent): void {
  // Creation event entity
  const creationEntity = new RaffleCreated(event.transaction.hash.concatI32(event.logIndex.toI32()))

  creationEntity.blockNumber = event.block.number
  creationEntity.blockTimestamp = event.block.timestamp
  creationEntity.transactionHash = event.transaction.hash

  creationEntity.save()

  // Create Raffle entity
  const raffleContract = RaflContract.bind(event.params.raffle)
  const raffle = new Raffle(event.params.raffle)
  raffle.entryPrice = raffleContract.entryPrice()
  raffle.minEntries = raffleContract.minEntries()
  raffle.creator = ensureUser(event.transaction.from).id
  raffle.participantsCount = 0
  raffle.entriesCount = 0
  raffle.deadline = raffleContract.deadline()
  raffle.status = raffleContract.gameStatus()
  raffle.creation = creationEntity.id
  raffle.tags = ''
  raffle.customFee = getRaffleCustomFee(event.params.raffle)
  raffle.inception = event.block.timestamp
  raffle.save()

  // Ensure Entry token (if defined)
  const entryTokenAddress = raffleContract.entryToken()
  if (entryTokenAddress.notEqual(Address.zero())) {
    const entryToken = ensureAsset(raffleContract.entryToken(), 0)
    if (entryToken !== null) {
      raffle.entryToken = entryToken.id
    }
  }

  // Create Prizes
  let prizesCount = 0
  let finished = false
  while (!finished) {
    const prizesCall = raffleContract.try_prizes(BigInt.fromI32(prizesCount))
    if (prizesCall.reverted) {
      finished = true
    } else {
      const prizeEntity = new Prize(`${raffle.id.toHexString()}/prizes/${prizesCount}`)
      const foundPrizeAddress = prizesCall.value.getAsset()
      const foundPrizeType = prizesCall.value.getAssetType()
      const asset = ensureAsset(foundPrizeAddress, foundPrizeType)
      prizeEntity.raffle = raffle.id
      prizeEntity.asset = asset.id
      prizeEntity.value = prizesCall.value.getValue()
      if (foundPrizeType === 1) {
        const erc721Contract = ERC721MetadataContract.bind(foundPrizeAddress)
        prizeEntity.uri = erc721Contract.tokenURI(prizeEntity.value)
      }
      raffle.tags = raffle.tags + ' ' + asset.name + ' ' + asset.symbol

      prizeEntity.save()
      prizesCount++
    }
  }
  raffle.tags = raffle.tags.trim()
  raffle.save()

  // Ensure token gating
  setTokenGate(event.params.raffle)

  // Listen for the created Raffl events
  NewRaffl.create(event.params.raffle)
}
