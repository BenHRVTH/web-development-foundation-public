declare module 'virtual:wdf-project' {
  const project: {
    manifest: import('@wdf/core').ProjectManifest;
    config: import('@wdf/core').EditableTokenConfig;
    widths: number[];
    typography: unknown;
    catalog: import('@wdf/adapter-react').RegistryCatalog;
    connection: import('@wdf/core/preview').PreviewConnection;
  };
  export default project;
}
