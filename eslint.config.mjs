// ESLint 9 flat config. O eslint-config-next 16 já é flat nativo,
// então é importado direto (sem FlatCompat).
import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'out/**', 'build/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...typescript,
]

export default config
