declare module '*.css' {
  const value: string
  export default value
}

declare module 'node-seal' {
  const init: () => Promise<any>
  export default init
}
