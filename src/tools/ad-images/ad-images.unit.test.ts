// biome-ignore-all lint/plugin: тест разбирает тело запроса
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleManageAdImages } from "./handler.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("manage_ad_images", () => {
  beforeEach(() => mockFetch.mockReset())

  it("загружает изображения и опускает необъявленный тип", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleManageAdImages({
      action: "add",
      images: [
        { image_data: "base64-1", name: "Краб" },
        { image_data: "base64-2", name: "Форель", type: "WIDE" }
      ]
    })

    expect(lastBody().params.AdImages).toEqual([
      { ImageData: "base64-1", Name: "Краб" },
      { ImageData: "base64-2", Name: "Форель", Type: "WIDE" }
    ])
  })

  it("адресует изображения хешами, а не числовыми ID", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { DeleteResults: [] } }))

    await handleManageAdImages({ action: "delete", ad_image_hashes: ["9f8c7b6a"] })

    expect(lastBody().method).toBe("delete")
    expect(lastBody().params.SelectionCriteria).toEqual({ AdImageHashes: ["9f8c7b6a"] })
  })

  it("читает все изображения аккаунта, когда фильтров нет", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AdImages: [] } }))

    await handleManageAdImages({ action: "get" })

    expect(lastBody().params.SelectionCriteria).toBeUndefined()
  })

  it("фильтрует выдачу по привязанности к объявлениям", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AdImages: [] } }))

    await handleManageAdImages({ action: "get", associated: "YES" })

    expect(lastBody().params.SelectionCriteria).toEqual({ Associated: "YES" })
  })

  it("требует данные, соответствующие действию", async () => {
    await expect(handleManageAdImages({ action: "add" })).rejects.toThrow("images")
    await expect(handleManageAdImages({ action: "delete" })).rejects.toThrow("ad_image_hashes")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
