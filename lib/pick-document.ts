import ExpoDocumentPicker from "expo-document-picker/build/ExpoDocumentPicker";

type GetDocumentOptions = {
  type?: string | string[];
  copyToCacheDirectory?: boolean;
  multiple?: boolean;
  base64?: boolean;
};

/**
 * Same behavior as expo-document-picker's getDocumentAsync, but imports the native
 * module directly so Metro never loads index.js's `export * from './types'` (which
 * can fail to resolve on some Android/Metro setups).
 */
export async function getDocumentAsync(options: GetDocumentOptions = {}) {
  const {
    type = "*/*",
    copyToCacheDirectory = true,
    multiple = false,
    base64 = true,
  } = options;
  const mimeTypes = typeof type === "string" ? [type] : type;
  return ExpoDocumentPicker.getDocumentAsync({
    type: mimeTypes,
    copyToCacheDirectory,
    multiple,
    base64,
  });
}
