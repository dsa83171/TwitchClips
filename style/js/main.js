const app = Vue.createApp({
    data(){
        return {
            test:0,
            ccList:[],
        }
    },
    mounted(){
        this.getCC();
    },
    methods:{
        btnClick(){
            this.test++;
        },
        async getCC(){
            var res = await axios.get('https://script.google.com/macros/s/AKfycbwNZIQhStcNYfLJecZ1_TkAbhKkqL3yNZl4_mcu-XHddivAAdT7k2B8zeueq3VH4UCzUQ/exec');
            console.log(res.data);
            this.ccList = res.data.split(",");
        }
        
    }
})
app.mount("#main");