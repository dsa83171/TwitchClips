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
            var res = await axios.get('https://script.google.com/macros/s/AKfycbw1CkxMrBYIDplcmFyFZtARd52n27YSki3hhOX2KipdY_KhMR-bMx0RTgju9DuA9wf2Cg/exec?action=getclips');
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
        async getClips(){
            await this.getToken();
            await this.getListFromSheet();
            // Step 1: 抽出網址的最後一段當作 ID
            const ids = this.urls.map(item => item[0].split('/').pop());

            // Step 2: 拼接 API URL
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