// Реестр инструментов: единственный список, который знает про все домены сразу.
// Импорты явные, не глоб: glob прячет инструмент от knip и ломает типизацию списка.
import type { ToolDescriptor } from "#shared/lib/tool"
import { getAccountBalanceTool } from "#tools/account/tool"
import { addAdExtensionsTool, deleteAdExtensionsTool, listAdExtensionsTool } from "#tools/ad-extensions/tool"
import { createAdGroupTool, deleteAdGroupsTool, listAdGroupsTool } from "#tools/ad-groups/tool"
import { manageAdImagesTool } from "#tools/ad-images/tool"
import { createTextAdTool, listAdsTool, manageAdsTool, moderateAdsTool, updateTextAdTool } from "#tools/ads/tool"
import { listAudienceTargetsTool, setAudienceTargetsTool } from "#tools/audience-targets/tool"
import { getBidAdjustmentsTool, setBidAdjustmentsTool } from "#tools/bid-adjustments/tool"
import { listBusinessesTool } from "#tools/businesses/tool"
import {
  createCampaignTool,
  getCampaignTool,
  getStrategyTool,
  listCampaignsTool,
  manageCampaignsTool,
  setStrategyTool,
  updateCampaignTool
} from "#tools/campaigns/tool"
import { getChangesTool } from "#tools/changes/tool"
import { getRegionsTool } from "#tools/dictionaries/tool"
import { listDynamicTargetsTool, manageDynamicTargetsTool } from "#tools/dynamic-targets/tool"
import { listFeedsTool } from "#tools/feeds/tool"
import { addKeywordsTool, listKeywordsTool, manageKeywordsTool, setKeywordBidsTool } from "#tools/keywords/tool"
import {
  getCampaignNegativeKeywordsTool,
  linkNegativeKeywordSetsTool,
  listNegativeKeywordSharedSetsTool,
  manageNegativeKeywordSharedSetsTool,
  setAdGroupNegativeKeywordsTool,
  setCampaignNegativeKeywordsTool
} from "#tools/negative-keywords/tool"
import { addRetargetingListTool, listRetargetingListsTool } from "#tools/retargeting/tool"
import { getSearchQueriesTool } from "#tools/search-queries/tool"
import { listSitelinksTool, setSitelinksTool } from "#tools/sitelinks/tool"
import { getStatisticsTool } from "#tools/statistics/tool"
import { addVcardTool, listVcardsTool } from "#tools/vcards/tool"

export const tools: readonly ToolDescriptor[] = [
  // Кампании и стратегии
  listCampaignsTool,
  getCampaignTool,
  createCampaignTool,
  updateCampaignTool,
  manageCampaignsTool,
  getStrategyTool,
  setStrategyTool,

  // Группы объявлений
  listAdGroupsTool,
  createAdGroupTool,
  deleteAdGroupsTool,

  // Объявления
  listAdsTool,
  createTextAdTool,
  updateTextAdTool,
  manageAdsTool,
  moderateAdsTool,

  // Ключевые фразы и ставки
  listKeywordsTool,
  addKeywordsTool,
  manageKeywordsTool,
  setKeywordBidsTool,

  // Минус-фразы
  getCampaignNegativeKeywordsTool,
  setCampaignNegativeKeywordsTool,
  setAdGroupNegativeKeywordsTool,
  listNegativeKeywordSharedSetsTool,
  manageNegativeKeywordSharedSetsTool,
  linkNegativeKeywordSetsTool,

  // Ассеты объявления
  listSitelinksTool,
  setSitelinksTool,
  listAdExtensionsTool,
  addAdExtensionsTool,
  deleteAdExtensionsTool,
  manageAdImagesTool,
  listVcardsTool,
  addVcardTool,

  // Таргетинг и корректировки
  listAudienceTargetsTool,
  setAudienceTargetsTool,
  listDynamicTargetsTool,
  manageDynamicTargetsTool,
  listRetargetingListsTool,
  addRetargetingListTool,
  getBidAdjustmentsTool,
  setBidAdjustmentsTool,

  // Отчёты
  getStatisticsTool,
  getSearchQueriesTool,

  // Аккаунт и справочники
  getAccountBalanceTool,
  listBusinessesTool,
  getChangesTool,
  listFeedsTool,
  getRegionsTool
]
