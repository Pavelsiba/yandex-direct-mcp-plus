// Реестр инструментов: единственный список, который знает про все домены сразу.
// Импорты явные, не глоб: glob прячет инструмент от knip и ломает типизацию списка.
import { withDryRun } from "#app/dry-run"
import type { ToolDescriptor } from "#shared/lib/tool"
import { getAccountBalanceTool } from "#tools/account/tool"
import { addAdExtensionsTool, deleteAdExtensionsTool, listAdExtensionsTool } from "#tools/ad-extensions/tool"
import { createAdGroupTool, deleteAdGroupsTool, listAdGroupsTool } from "#tools/ad-groups/tool"
import { manageAdImagesTool } from "#tools/ad-images/tool"
import { createTextAdTool, listAdsTool, manageAdsTool, moderateAdsTool, updateTextAdTool } from "#tools/ads/tool"
import { listAudienceTargetsTool, setAudienceTargetsTool } from "#tools/audience-targets/tool"
import {
  addBidAdjustmentsTool,
  deleteBidAdjustmentsTool,
  getBidAdjustmentsTool,
  setBidAdjustmentsTool
} from "#tools/bid-adjustments/tool"
import { listBusinessesTool } from "#tools/businesses/tool"
import {
  createCampaignTool,
  getCampaignTool,
  getStrategyTool,
  listCampaignsTool,
  manageCampaignsTool,
  setPriorityGoalsTool,
  setStrategyTool,
  updateCampaignTool
} from "#tools/campaigns/tool"
import { getChangesTool } from "#tools/changes/tool"
import { getRegionsTool, listTimeZonesTool } from "#tools/dictionaries/tool"
import { listDynamicTargetsTool, manageDynamicTargetsTool } from "#tools/dynamic-targets/tool"
import { listFeedsTool } from "#tools/feeds/tool"
import {
  addKeywordsTool,
  getKeywordAuctionTool,
  listKeywordsTool,
  manageKeywordsTool,
  setKeywordBidsTool,
  updateKeywordsTool
} from "#tools/keywords/tool"
import {
  getCampaignNegativeKeywordsTool,
  linkNegativeKeywordSetsTool,
  listNegativeKeywordSharedSetsTool,
  manageNegativeKeywordSharedSetsTool,
  setAdGroupNegativeKeywordsTool,
  setCampaignNegativeKeywordsTool
} from "#tools/negative-keywords/tool"
import {
  addRetargetingListTool,
  deleteRetargetingListsTool,
  listRetargetingListsTool,
  updateRetargetingListsTool
} from "#tools/retargeting/tool"
import { getSearchQueriesTool } from "#tools/search-queries/tool"
import { deleteSitelinksTool, listSitelinksTool, setSitelinksTool } from "#tools/sitelinks/tool"
import { getStatisticsTool } from "#tools/statistics/tool"
import { getTimeTargetingTool, setTimeTargetingTool } from "#tools/time-targeting/tool"
import { deleteVcardsTool, listVcardsTool } from "#tools/vcards/tool"

export const tools: readonly ToolDescriptor[] = [
  // Кампании и стратегии
  listCampaignsTool,
  getCampaignTool,
  createCampaignTool,
  updateCampaignTool,
  manageCampaignsTool,
  getStrategyTool,
  setStrategyTool,
  setPriorityGoalsTool,
  getTimeTargetingTool,
  setTimeTargetingTool,

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
  updateKeywordsTool,
  manageKeywordsTool,
  setKeywordBidsTool,
  getKeywordAuctionTool,

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
  deleteSitelinksTool,
  listAdExtensionsTool,
  addAdExtensionsTool,
  deleteAdExtensionsTool,
  manageAdImagesTool,
  listVcardsTool,
  deleteVcardsTool,

  // Таргетинг и корректировки
  listAudienceTargetsTool,
  setAudienceTargetsTool,
  listDynamicTargetsTool,
  manageDynamicTargetsTool,
  listRetargetingListsTool,
  addRetargetingListTool,
  updateRetargetingListsTool,
  deleteRetargetingListsTool,
  getBidAdjustmentsTool,
  addBidAdjustmentsTool,
  setBidAdjustmentsTool,
  deleteBidAdjustmentsTool,

  // Отчёты
  getStatisticsTool,
  getSearchQueriesTool,

  // Аккаунт и справочники
  getAccountBalanceTool,
  listBusinessesTool,
  getChangesTool,
  listFeedsTool,
  getRegionsTool,
  listTimeZonesTool
].map(withDryRun)
