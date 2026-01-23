// File System Access API 타입 정의
export interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}

export interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

export interface FileSystemWritableFileStream {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

/**
 * Blob을 파일로 다운로드 (File System Access API 사용)
 * @param blob - 다운로드할 Blob 데이터
 * @param fileName - 저장할 파일명
 * @param fileType - 파일 타입 정보 (description, accept)
 */
export async function downloadFile(
  blob: Blob,
  fileName: string,
  fileType: {
    description: string;
    accept: Record<string, string[]>;
  },
): Promise<void> {
  // File System Access API 사용 (최신 브라우저)
  if ("showSaveFilePicker" in window) {
    try {
      // 파일 저장 다이얼로그 표시
      const fileHandle = (await (
        window as Window & {
          showSaveFilePicker: (
            options: SaveFilePickerOptions,
          ) => Promise<FileSystemFileHandle>;
        }
      ).showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: fileType.description,
            accept: fileType.accept,
          },
        ],
      })) as FileSystemFileHandle;

      // 파일 쓰기
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      alert("파일이 성공적으로 저장되었습니다.");
    } catch (error: unknown) {
      // 사용자가 취소한 경우는 무시
      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name !== "AbortError"
      ) {
        console.error("파일 저장 오류:", error);
        // Fallback: 기존 방식 사용
        fallbackDownload(blob, fileName);
      }
    }
  } else {
    // File System Access API를 지원하지 않는 브라우저는 기존 방식 사용
    fallbackDownload(blob, fileName);
  }
}

/**
 * URL에서 파일을 가져와서 다운로드
 * @param url - 다운로드할 파일의 URL (Blob URL 포함)
 * @param fileName - 저장할 파일명
 * @param fileType - 파일 타입 정보 (description, accept)
 */
export async function downloadFileFromUrl(
  url: string,
  fileName: string,
  fileType: {
    description: string;
    accept: Record<string, string[]>;
  },
): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    await downloadFile(blob, fileName, fileType);
  } catch (error) {
    console.error("파일 다운로드 오류:", error);
    // Fallback: 기존 방식 사용
    fallbackDownloadFromUrl(url, fileName);
  }
}

/**
 * Fallback: 기존 방식으로 Blob 다운로드
 */
function fallbackDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Fallback: 기존 방식으로 URL에서 다운로드
 */
function fallbackDownloadFromUrl(url: string, fileName: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
