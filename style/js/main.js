const app = Vue.createApp({
    data(){
        return {
            token:"",
            apiUrl:"",
            urls:[],
            clips:[],
            isDarkTheme: true,
            showPlayer: false,
            currentEmbedUrl: '',
        };
    },
    created() {
        const storedTheme = localStorage.getItem("theme");
        this.isDarkTheme = storedTheme === "dark-theme";
        this.applyTheme();
    },
    mounted(){
        this.getClips();
    },
    methods:{
        toggleTheme() {
            const theme = this.isDarkTheme ? "dark-theme" : "light-theme";
            localStorage.setItem("theme", theme);
            this.applyTheme();
        },
        applyTheme() {
            const theme = this.isDarkTheme ? "dark-theme" : "light-theme";
            document.body.className = theme;
          
            // 換圓球上的 emoji
            this.$nextTick(() => {
                const sliderParent = document.querySelector(".slider-icon");
                if (sliderParent) {
                    sliderParent.setAttribute("data-icon", this.isDarkTheme ? "🌙" : "☀️");
                }
            });
        },
        async getListFromSheet(){
            var res = await axios.get('https://script.google.com/macros/s/AKfycbxJVw6Lp0h5j0WohEMmWzBpEGtDZYDZcVerr5nqDRyWpzMylEi_uNbA-1Im9Pfddl9r9A/exec?action=getclips');
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
        openPlayer(clipId) {
            this.currentEmbedUrl = `https://clips.twitch.tv/embed?clip=${clipId}&parent=${window.location.hostname}`;
            this.showPlayer = true;
        },
        closePlayer() {
            this.showPlayer = false;
            this.currentEmbedUrl = '';
        }
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