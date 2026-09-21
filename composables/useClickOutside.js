import { onMounted, onBeforeUnmount } from 'vue'

export function useClickOutside(targetRef, callback) {
    const handleClick = (event) => {
        const refs = Array.isArray(targetRef) ? targetRef : [targetRef]
        const clickedInside = refs.some(r => r?.value && r.value.contains(event.target))
        if (!clickedInside) {
            callback(event)
        }
    }

    onMounted(() => {
        if (typeof document !== 'undefined') {
            document.addEventListener('click', handleClick)
        }
    })

    onBeforeUnmount(() => {
        if (typeof document !== 'undefined') {
            document.removeEventListener('click', handleClick)
        }
    })
}
