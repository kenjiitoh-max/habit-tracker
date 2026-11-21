export const HOME_BODY_SETTING_KEY = 'habit-tracker:home-body-visible:v1'

export function createHomeBodySetting(demo: boolean) {
  let visible = false
  return {
    load(): boolean {
      if (demo) return visible
      return localStorage.getItem(HOME_BODY_SETTING_KEY) === 'true'
    },
    save(next: boolean): void {
      if (demo) visible = next
      else localStorage.setItem(HOME_BODY_SETTING_KEY, String(next))
    },
  }
}

const demoSetting = createHomeBodySetting(true)
const realSetting = createHomeBodySetting(false)
export const getHomeBodySetting = (demo: boolean) => demo ? demoSetting : realSetting
