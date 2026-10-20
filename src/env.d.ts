/// <reference types="vite/client" />

declare module '*.css';

declare module 'virtual:content' {
  const content: import('./types.ts').SiteContent;
  export default content;
}
