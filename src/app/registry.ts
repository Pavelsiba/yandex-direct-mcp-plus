// Реестр инструментов: единственный список, который знает про все домены сразу.
// Импорты явные, не глоб: glob прячет инструмент от knip и ломает типизацию списка.
import type { ToolDescriptor } from "#shared/lib/tool"
import { getAccountBalanceTool } from "#tools/account/tool"
import { addAdExtensionsTool, deleteAdExtensionsTool, listAdExtensionsTool } from "#tools/ad-extensions/tool"
import { createAdGroupTool, deleteAdGroupsTool, listAdGroupsTool, updateAdGroupTool } from "#tools/ad-groups/tool"
import { manageAdImagesTool } from "#tools/ad-images/tool"
import {
  createResponsiveAdTool,
  listAdsTool,
  manageAdsTool,
  moderateAdsTool,
  updateResponsiveAdTool
} from "#tools/ads/tool"
import { listAudienceTargetsTool, setAudienceTargetsTool } from "#tools/audience-targets/tool"
import { authStatusTool, finishLoginTool, logoutTool, startLoginTool } from "#tools/auth/tool"
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
import { getKeywordForecastTool } from "#tools/forecast/tool"
import {
  addKeywordsTool,
  getKeywordAuctionTool,
  listKeywordsTool,
  manageKeywordsTool,
  setAutoKeywordBidsTool,
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

// Группы — данные, а не комментарии: по ним собираются таблицы инструментов в README
// (npm run docs:tools), и раскладка в реестре с документацией не расходится.
export type ToolGroup = { readonly title: string; readonly tools: readonly ToolDescriptor[] }

const loginTools: readonly ToolDescriptor[] = [startLoginTool, finishLoginTool, authStatusTool, logoutTool]

export const toolGroups: readonly ToolGroup[] = [
  {
    title: "Подключение",
    tools: loginTools
  },
  {
    title: "Кампании и стратегии",
    tools: [
      listCampaignsTool,
      getCampaignTool,
      createCampaignTool,
      updateCampaignTool,
      manageCampaignsTool,
      getStrategyTool,
      setStrategyTool,
      setPriorityGoalsTool,
      getTimeTargetingTool,
      setTimeTargetingTool
    ]
  },
  {
    title: "Группы объявлений",
    tools: [listAdGroupsTool, createAdGroupTool, updateAdGroupTool, deleteAdGroupsTool]
  },
  {
    title: "Объявления",
    tools: [listAdsTool, createResponsiveAdTool, updateResponsiveAdTool, manageAdsTool, moderateAdsTool]
  },
  {
    title: "Ключевые фразы и ставки",
    tools: [
      listKeywordsTool,
      addKeywordsTool,
      updateKeywordsTool,
      manageKeywordsTool,
      setKeywordBidsTool,
      setAutoKeywordBidsTool,
      getKeywordAuctionTool,
      getKeywordForecastTool
    ]
  },
  {
    title: "Минус-фразы",
    tools: [
      getCampaignNegativeKeywordsTool,
      setCampaignNegativeKeywordsTool,
      setAdGroupNegativeKeywordsTool,
      listNegativeKeywordSharedSetsTool,
      manageNegativeKeywordSharedSetsTool,
      linkNegativeKeywordSetsTool
    ]
  },
  {
    title: "Ассеты объявления",
    tools: [
      listSitelinksTool,
      setSitelinksTool,
      deleteSitelinksTool,
      listAdExtensionsTool,
      addAdExtensionsTool,
      deleteAdExtensionsTool,
      manageAdImagesTool,
      listVcardsTool,
      deleteVcardsTool
    ]
  },
  {
    title: "Таргетинг и корректировки",
    tools: [
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
      deleteBidAdjustmentsTool
    ]
  },
  {
    title: "Отчёты",
    tools: [getStatisticsTool, getSearchQueriesTool]
  },
  {
    title: "Аккаунт и справочники",
    tools: [getAccountBalanceTool, listBusinessesTool, getChangesTool, listFeedsTool, getRegionsTool, listTimeZonesTool]
  }
]

export const tools: readonly ToolDescriptor[] = toolGroups.flatMap((group) => group.tools)

// Для общего сервера: вход там свой, по спеке remote MCP, а start_login положил бы токен
// одного пользователя в файл, общий для всех. Идёт в паре с requireRequestToken.
export const hostedTools: readonly ToolDescriptor[] = tools.filter((tool) => !loginTools.includes(tool))
