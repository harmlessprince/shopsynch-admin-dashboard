<template>
    <main class="min-h-screen pt-[5rem] bg_container">
        <section class="min-h-screen grid grid-cols-2 authentication_section_grid max-w-[1000px] gap-x-[116px] mx-auto px-[2rem] items-center">
        <div class="max-w-[383px] z-50">
            <img src="/logos/dashboard-logo.png" class='max-w-[280px] h-[40px]' alt="shopsync login for e-commerce backend api service" />
            <div class="mt-[14.0rem] text-[#fff] powering_your_store">
                <h1 class="font-[700] text-[3.9rem] leading-[47px]">Verification ongoing...</h1>
                <p class="text-[1.6rem] leading-[28px] font-[400] mt-[2.4rem]">
                    Your email is being verified at the moment. Please wait for few seconds.
                </p>
            </div>
        </div>
       
        <div class="mt-[6.5rem] h-[768px] self-end rounded-t-[24px] rounded-b-0 max-w-[460px] bg-[#fff] p-[4.5rem] box-border">
            <NuxtPage />
        </div>
  
    </section>
    </main>
    </template>

    <style scoped>
    .bg_container{
        background-image: linear-gradient(to right, rgba(33, 33, 33, 0.84), rgba(66, 66, 66, 0.24)),
                    url('/images/auth_bg_second.png');
        background-size: cover;
        background-repeat: no-repeat;
        background-position: center; 
    }

    .powering_your_store{
          font-family: 'Zen Kaku Gothic Antique'
    }
  
</style>