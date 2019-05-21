from flask import Flask, render_template, request, jsonify, send_from_directory
import os

app = Flask(__name__, template_folder=os.curdir)


@app.route('/')
def home():
	return render_template('index.html')

@app.route('/<path:path>')
def getStaticFiles(path):
	return send_from_directory(os.curdir, path)

if __name__ == "__main__":
    app.run(host = '0.0.0.0', port=int(443),ssl_context=('ssl/certificate.crt', 'ssl/private.key'), debug=True)