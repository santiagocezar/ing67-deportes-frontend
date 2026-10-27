<script lang="ts" setup>
const { $bootstrap } = useNuxtApp()
import type { Datepicker } from "bootstrap";
import type { InputHTMLAttributes } from "vue";

// vue passes attributes to the root element by default (https://vuejs.org/guide/components/attrs)
// but being explicit here provides better typescript support (see: https://stackoverflow.com/a/77797572/11463241)
interface Props extends /* @vue-ignore */ InputHTMLAttributes {

}
const props = defineProps<Props>();

const model = defineModel<string>();

const input = useTemplateRef<HTMLInputElement>("input")

let setDate: (s: string) => void = () => {}

let datepicker: Datepicker;

onMounted(() => {
    datepicker = new $bootstrap.Datepicker(input.value)
    setDate = (s) => datepicker.setSelectedDates([s])
})
onBeforeUnmount(() => {
    setDate = () => {}
    datepicker.dispose()
})

function toISOString(date: string) {
    return new Date(`${date}T00:00:00`).toISOString();
}

function onInputChange(event: Event) {
    const date = new Date((event.target as HTMLInputElement).value)
    let s: string
    if (!isNaN(date.getTime())) {
        s = model.value = date.toISOString()
        setDate(s.split("T", 1)[0]!)
    }
}
function onDateChange(event: Event) {
    model.value = toISOString((event as unknown as {dates: string[]}).dates[0]!);
}

</script>

<template>
    <input
        ref="input"
        v-bind="props"
        class="form-control"
        type="text"
        autocomplete="off"
        placeholder="Elegir fecha"
        required
        @change="onInputChange"
        @['change.bs.datepicker']="onDateChange"
    />
</template>
