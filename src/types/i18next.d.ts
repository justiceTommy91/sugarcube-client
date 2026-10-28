import dashboard from '../../locales/en/dashboard.json'
import learnmore from '../../locales/en/learnmore.json'
import translation from '../../locales/en/translation.json'
import common from '../../locales/en/common.json'
import campaigns from '../../locales/en/campaigns.json'

export type TranslationKeys = keyof typeof translation
export type DashboardKeys = keyof typeof dashboard
export type LearnMoreKeys = keyof typeof learnmore
export type CommonKeys = keyof typeof common
export type CampaignsKeys = keyof typeof campaigns.campaigns

declare module 'i18next' {
    export type TranslationKey<NS extends Namespace, Subset extends TFuncKey<NS> = TFuncKey<NS>> = Subset
    interface CustomTypeOptions {
        returnNull: false
        allowObjectInHTMLChildren: true
        defaultNS: 'translation'
        ns: ['translation', 'dashboard', 'learnmore', 'common', 'campaigns']
        resources: {
            translation: typeof translation
            learnmore: typeof learnmore
            common: typeof common
            dashboard: typeof dashboard
            campaigns: typeof campaigns.campaigns
        }
    }
}
