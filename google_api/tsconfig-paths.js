// paths.ts
import { register } from 'tsconfig-paths'
import { resolve } from 'path'

const baseUrl = resolve('./')
register({
    baseUrl,
    paths: {
        '@/*': ['*']
    }
})