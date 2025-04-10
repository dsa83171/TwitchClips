const app = Vue.createApp({
    data(){
        return {
            token:"",
            apiUrl:"",
            urls:[],
            clips:[],
            currentTheme: 'dark', // 預設暗色主題
        }
    },
    mounted(){
        this.getClips();

        // 從 localStorage 讀主題，若沒有則預設 dark
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.currentTheme = savedTheme;
        document.body.classList.add(`${this.currentTheme}-theme`);
    },
    methods:{
        toggleTheme() {
            const oldTheme = this.currentTheme;
            this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    
            document.body.classList.remove(`${oldTheme}-theme`);
            document.body.classList.add(`${this.currentTheme}-theme`);
            // 存入 localStorage
            localStorage.setItem('theme', this.currentTheme);
        },
        async getListFromSheet(){
            var res = await axios.get('https://script.google.com/macros/s/AKfycbxvxarhqCNjI0Z8FCimRYdpNoJY43CB1p0m_dnIjlhs8yk8c4xaROtFUEY1098k8u0_/exec');
            console.log(res.data);
            this.urls = res.data;
        },
        async getToken(){
            var res = await axios.post('https://id.twitch.tv/oauth2/token', new URLSearchParams({
                client_id: '2hcw7jubxmk94gkrzhao4wbznzobjv',
                client_secret: 'mz71nl4tw9a9hw2rjz8mpowm38c1hv',
                grant_type: 'client_credentials'
              }), {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                }
              });
           console.log(res.data);
           this.token = res.data.access_token;
        },
        //取得剪輯
        async getClips(){
            await this.getToken();
            await this.getListFromSheet();
            // 抽出網址中 clip/ 後面到 ? 前的部分作為 ID
            const ids = this.urls.map(item => {
                const match = item[0].match(/clip\/([^?]+)/);
                return match ? match[1] : null;
            }).filter(id => id);
              
            // 拼接 API URL
            const twitchClipsApiUrl = `https://api.twitch.tv/helix/clips?` + ids.map(id => `id=${id}`).join('&');

            var res = await axios.get(twitchClipsApiUrl,{
                 headers: { 
                    'Authorization': 'Bearer '+this.token,
                    'Client-Id': '2hcw7jubxmk94gkrzhao4wbznzobjv'
                }
            });
            console.log(res.data);
            this.clips = res.data;
        },
        //計算影片秒數
        formatDuration(seconds) { 
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        },
    },
    computed:{
        totalDuration() {
            if (!this.clips || !Array.isArray(this.clips.data)) return '0:00';

            const totalSeconds = this.clips.data.reduce((sum, clip) => sum + clip.duration, 0);
            const mins = Math.floor(totalSeconds / 60);
            const secs = Math.floor(totalSeconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    }
})
app.mount("#main");