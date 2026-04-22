<script setup>
import {defineProps, defineEmits, ref} from 'vue'

const authStore = useAuthStore();
const logoutModalRef = ref(null)
function logout() {
  authStore.logout();
}

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue'])

useClickOutside(logoutModalRef, () => {
  emit('update:modelValue', false)
})

function toggle() {
  emit('update:modelValue', !props.modelValue)
}

</script>

<template>
    <div class="" ref="logoutModalRef">
            <!-- The Modal -->
            <div id="myModal" class="modal">

            <!-- Modal content -->
            <div class="modal-content font-[400] text-[16px] leading-[22px] text-[#000] relative">
                <span class="material-symbols-outlined absolute top-[24px] right-[40px] cursor-pointer" @click="toggle">cancel</span>
                  <div class="flex flex-col gap-y-[1.6rem] mt-[4.5rem] text-center">
                    <h2 class="font-[600] text-[18px] text-[#000]">Logout</h2>
                    <p>
                      You are about to logout of your dashboard. Are you sure you want to logout?
                    </p>
                    <div class="mt-[8px] flex justify-between w-full">
                      <button class="cursor-pointer w-[48%] h-[47px] bg-[#EDEFF2] txt-[1.6rem] font-[500] text-[#000] rounded-[10px]" @click="toggle">No, cancel</button>
                      <button class="cursor-pointer w-[48%] h-[47px] bg-[#FFE4E5] txt-[1.6rem] font-[500] text-[#E94448] rounded-[10px]" @click="logout()">Yes, logout</button>
                    </div>
                </div>
            </div>
            </div>    
      </div>

</template>

<style scoped>
/* The Modal (background) */
.modal {
    display: block; 
    position: fixed; /* Stay in place */
    z-index: 1000; /* Sit on top */
    padding-top: 20rem; /* Location of the box */
    left: 0;
    top: 0;
    width: 100%; /* Full width */
    height: 100%; /* Full height */
    overflow: auto; /* Enable scroll if needed */
    background-color: rgb(0,0,0); /* Fallback color */
    background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
  }
  
  /* Modal Content */
  .modal-content {
    background-color: #fff;
    margin: auto;
    padding: 40px;
    border-radius: 10px;
    width: 460px;
  }
  
  /* The Close Button */
  .close {
    color: #aaaaaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
  }
  
  .close:hover,
  .close:focus {
    color: #000;
    text-decoration: none;
    cursor: pointer;
  }
</style>