export async function shareOrCopy(url: string): Promise<void> {
    if (navigator.share) {
        try {
            await navigator.share({ url })
            return
        } catch {
            // User cancelled share sheet
        }
    }
    try {
        await navigator.clipboard.writeText(url)
    } catch {
        // clipboard unavailable — silently skip
    }
}
