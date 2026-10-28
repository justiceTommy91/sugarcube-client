export type WalkedFile = {
    file: File
    relativePath: string
}

export type FilenamePredicate = (name: string) => boolean

type FileSystemEntryLike = {
    isFile: boolean
    isDirectory: boolean
    fullPath: string
    name: string
    file?: (resolve: (file: File) => void, reject: (err: unknown) => void) => void
    createReader?: () => FileSystemDirectoryReaderLike
}

type FileSystemDirectoryReaderLike = {
    readEntries: (resolve: (entries: FileSystemEntryLike[]) => void, reject: (err: unknown) => void) => void
}

type DataTransferItemWithEntry = DataTransferItem & {
    webkitGetAsEntry?: () => FileSystemEntryLike | null
}

const relativePathOf = (file: File): string => {
    const fileWithPath = file as File & { webkitRelativePath?: string }
    return fileWithPath.webkitRelativePath && fileWithPath.webkitRelativePath !== ''
        ? fileWithPath.webkitRelativePath
        : file.name
}

const readFileFromEntry = (entry: FileSystemEntryLike): Promise<File> =>
    new Promise((resolve, reject) => {
        if (!entry.file) {
            reject(new Error('Entry has no file() method'))
            return
        }
        entry.file(resolve, reject)
    })

const readEntriesBatch = (reader: FileSystemDirectoryReaderLike): Promise<FileSystemEntryLike[]> =>
    new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject)
    })

const collectFromEntry = async (
    entry: FileSystemEntryLike,
    pathPrefix: string,
    accept: FilenamePredicate,
    out: WalkedFile[],
): Promise<void> => {
    if (entry.isFile) {
        if (!accept(entry.name)) return
        const file = await readFileFromEntry(entry)
        const relativePath = pathPrefix === '' ? file.name : `${pathPrefix}/${file.name}`
        out.push({ file, relativePath })
        return
    }

    if (entry.isDirectory && entry.createReader) {
        const reader = entry.createReader()
        const nextPrefix = pathPrefix === '' ? entry.name : `${pathPrefix}/${entry.name}`
        let batch: FileSystemEntryLike[]
        do {
            // eslint-disable-next-line no-await-in-loop -- sequential directory walk is intentional
            batch = await readEntriesBatch(reader)
            for (const child of batch) {
                // eslint-disable-next-line no-await-in-loop -- sequential directory walk is intentional
                await collectFromEntry(child, nextPrefix, accept, out)
            }
        } while (batch.length > 0)
    }
}

export const walkInputFiles = (files: FileList | File[], accept: FilenamePredicate): WalkedFile[] => {
    const list: WalkedFile[] = []
    for (const file of Array.from(files)) {
        if (accept(file.name)) {
            list.push({ file, relativePath: relativePathOf(file) })
        }
    }
    list.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
    return list
}

export const walkDataTransferItems = async (
    items: DataTransferItemList,
    accept: FilenamePredicate,
): Promise<WalkedFile[]> => {
    const collected: WalkedFile[] = []
    const roots: FileSystemEntryLike[] = []

    for (const item of Array.from(items)) {
        const withEntry = item as DataTransferItemWithEntry
        const entry = withEntry.webkitGetAsEntry?.()
        if (entry) {
            roots.push(entry)
        }
    }

    for (const entry of roots) {
        // eslint-disable-next-line no-await-in-loop -- sequential walk of dropped roots is intentional
        await collectFromEntry(entry, '', accept, collected)
    }

    collected.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
    return collected
}
