import streamlit as st
import requests
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# Page configuration
st.set_page_config(page_title="AI Trading Terminal", layout="wide", page_icon="📈")

st.title("🤖 Agentic AI Trading Terminal")
st.markdown("### Phase 1: Quantitative Vitals Engine")

# --- Sidebar Controls ---
st.sidebar.header("Control Panel")
ticker = st.sidebar.text_input("Enter Ticker Symbol", value="RELIANCE.NS").upper()
period = st.sidebar.selectbox("Timeframe", ["1mo", "3mo", "6mo", "1y", "2y"], index=1)

# --- Fetch Data Button ---
if st.sidebar.button("Analyze Stock"):
    with st.spinner(f"Fetching live data for {ticker} from Backend API..."):
        try:
            # Call your FastAPI backend on port 8001
            api_url = f"http://localhost:8001/api/v1/vitals/{ticker}?period={period}"
            response = requests.get(api_url)
            
            if response.status_code == 200:
                json_data = response.json()
                
                # Convert the JSON back into a Pandas DataFrame
                # Backend now returns full dataset under the 'data' key
                df = pd.DataFrame.from_dict(json_data["data"], orient="index")
                df.index = pd.to_datetime(df.index) # Ensure index is datetime

                # --- Create Interactive Charts using Plotly ---
                st.success(f"Successfully loaded {len(df)} days of data for {ticker}")
                
                # Show key metrics at the top
                m1, m2, m3 = st.columns(3)
                m1.metric("Latest Price", f"₹{json_data['latest_price']:.2f}")
                m2.metric("RSI (14)", f"{json_data['rsi_14']:.2f}")
                m3.metric("SMA (20)", f"₹{json_data['sma_20']:.2f}")
                
                # Create a layout with 2 rows: Main chart (Price+SMA) and RSI chart
                fig = make_subplots(rows=2, cols=1, shared_xaxes=True, 
                                    vertical_spacing=0.03, subplot_titles=(f'{ticker} Price & SMA', 'RSI (14)'),
                                    row_width=[0.2, 0.7])

                # Row 1: Candlestick Chart
                fig.add_trace(go.Candlestick(x=df.index, open=df['Open'], high=df['High'], 
                                             low=df['Low'], close=df['Close'], name='Price'), 
                              row=1, col=1)
                
                # Row 1: Simple Moving Average (SMA)
                fig.add_trace(go.Scatter(x=df.index, y=df['SMA_20'], line=dict(color='blue', width=1.5), name='SMA 20'), 
                              row=1, col=1)

                # Row 2: RSI
                fig.add_trace(go.Scatter(x=df.index, y=df['RSI_14'], line=dict(color='purple', width=1.5), name='RSI'), 
                              row=2, col=1)
                
                # Add RSI Overbought/Oversold lines
                fig.add_hline(y=70, line_dash="dash", line_color="red", row=2, col=1)
                fig.add_hline(y=30, line_dash="dash", line_color="green", row=2, col=1)

                # Update layout aesthetics
                fig.update_layout(height=700, template="plotly_dark", xaxis_rangeslider_visible=False)
                
                # Render the chart in Streamlit
                st.plotly_chart(fig, use_container_width=True)

                # Show the raw data table below
                with st.expander("View Raw API Data"):
                    st.dataframe(df.tail(10))

                # --- AI ANALYSIS SECTION ---
                st.markdown("---")
                st.markdown("### 🧠 Quantitative AI Analysis")
                st.caption("Powered by Qwen 2.5 Coder 32B & RAG Memory")

                # State management for AI button to avoid layout flicker
                if st.button(f"Generate Trading Thesis for {ticker}", type="primary"):
                    with st.spinner("Qwen 2.5 is reading the charts and digesting the latest news..."):
                        try:
                            analyze_url = f"http://localhost:8001/api/v1/analyze/{ticker}"
                            ai_response = requests.get(analyze_url)
                            
                            if ai_response.status_code == 200:
                                ai_data = ai_response.json()
                                
                                # Show AI insights
                                st.success("Analysis Complete")
                                
                                # Use columns for AI specific stats
                                acol1, acol2 = st.columns([1, 4])
                                acol1.info(f"News Context: {ai_data.get('news_analyzed', 0)} articles")
                                acol2.markdown(f"**AI Verdict:**\n\n{ai_data.get('ai_thesis', 'No analysis provided.')}")
                                
                            else:
                                st.error(f"Error from AI Brain: {ai_response.text}")
                        
                        except Exception as e:
                            st.error(f"Failed to connect to AI Brain: {e}")
            else:
                st.error(f"Error from API: {response.text}")
                
        except requests.exceptions.ConnectionError:
            st.error("🚨 Cannot connect to the backend. Is your FastAPI server running on localhost:8001?")