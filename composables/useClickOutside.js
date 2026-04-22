import { onMounted, onBeforeUnmount } from 'vue'

export function useClickOutside(targetRef, callback) {
    const handleClick = (event) => {
        if (targetRef.value && !targetRef?.value?.contains(event.target)) {
            callback(event)
        }
    }

    onMounted(() => {
        document.addEventListener('click', handleClick)
    })

    onBeforeUnmount(() => {
        document.removeEventListener('click', handleClick)
    })
}
