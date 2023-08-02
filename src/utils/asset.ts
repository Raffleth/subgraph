import { Address, log } from '@graphprotocol/graph-ts'

import { ERC20Metadata as AssetMetadataContract } from '../types/RafflFactory/ERC20Metadata'
import { Asset } from '../types/schema'

export function ensureAsset(address: Address, assetType: i32): Asset {
  if (address.equals(Address.zero())) {
    log.critical('Cannot add zero address!', [])
  }
  let entity = Asset.load(address)
  if (!entity) {
    log.info('Trying to add asset: {}', [address.toHexString()])
    entity = new Asset(address)
    // Metadata
    const contract = AssetMetadataContract.bind(address)
    entity.name = contract.name()
    entity.symbol = contract.symbol()
    const decimalsCall = contract.try_decimals()
    entity.decimals = decimalsCall.reverted ? 0 : decimalsCall.value
    // Asset type. If decimals reverts its because its an ERC721.
    entity.type = assetType === 0 || assetType === 1 ? assetType : decimalsCall.reverted ? 1 : 0
    entity.save()
    log.info('{} Asset created! {} {} {}', [
      entity.type === 0 ? 'ERC20' : 'ERC721',
      address.toHexString(),
      entity.name,
      entity.symbol,
      entity.decimals.toString()
    ])
  }
  return entity
}
