from flask import Flask, jsonify, request
import requests
import time
import os
import json

app = Flask(__name__)

DATABRICKS_INSTANCE_URL = #add your Url here
DATABRICKS_TOKEN = #add your token here

headers = {
    'Authorization': f'Bearer {DATABRICKS_TOKEN}',
    'Content-Type': 'application/json'
}

def save_to_file(data, absolute_path):
    """Save JSON data to a specified absolute path, overwriting if the file already exists."""
    parent_dir = os.path.dirname(absolute_path)
    if not os.path.exists(parent_dir):
        os.makedirs(parent_dir)

    with open(absolute_path, 'w') as file:
        json.dump(data, file, indent=2)
    
    return absolute_path

@app.route('/workflow/execute', methods=['GET'])
def execute_workflow():
    job_id = request.args.get('job_id')

    if not job_id:
        return jsonify({'error': 'Job ID is required'}), 400

    create_run_url = f"{DATABRICKS_INSTANCE_URL}/api/2.1/jobs/run-now"
    response = requests.post(create_run_url, headers=headers, json={"job_id": job_id})

    if response.status_code != 200:
        return jsonify({'error': response.json()}), response.status_code

    run_id = response.json().get('run_id')
    if not run_id:
        return jsonify({'error': 'Failed to start job run'}), 500

    monitor_url = f"{DATABRICKS_INSTANCE_URL}/api/2.1/jobs/runs/get?run_id={run_id}"

    while True:
        monitor_response = requests.get(monitor_url, headers=headers)
        if monitor_response.status_code != 200:
            return jsonify({'error': monitor_response.json()}), monitor_response.status_code

        run_info = monitor_response.json()
        state = run_info['state']['life_cycle_state']
        result_state = run_info['state'].get('result_state')

        logs = []
        tasks = run_info.get('tasks', [])

        for task in tasks:
            task_run_id = task.get('run_id')
            if task_run_id:
                task_output_response = requests.get(
                    f"{DATABRICKS_INSTANCE_URL}/api/2.1/jobs/runs/get-output",
                    headers=headers,
                    params={"run_id": task_run_id}
                )

                if task_output_response.status_code == 200:
                    task_output = task_output_response.json()
                    notebook_output = task_output.get('notebook_output', {}).get('result', 'No output')
                    logs.append({
                        "task_key": task.get('task_key'),
                        "task_run_id": task_run_id,
                        "output": notebook_output,
                        "state": {
                            "result_state": task.get('state', {}).get('result_state'),
                            "state_message": task.get('state', {}).get('state_message'),
                            "error_trace": task_output.get('error_trace', 'No error trace available')
                        }
                    })
                else:
                    logs.append({
                        "task_key": task.get('task_key'),
                        "task_run_id": task_run_id,
                        "error": "Failed to retrieve logs for this task"
                    })

        result_data = {
            "status": state,
            "run_id": run_id,
            "result_state": result_state,
            "task_logs": logs
        }

        absolute_path = 'C:/Users/DELL/Desktop/ang9f/frontend/src/assets/data/dummy.json'
        file_path = save_to_file(result_data, absolute_path)

        if state in ['TERMINATED', 'SUCCESS', 'FAILED', 'CANCELLED']:
            return jsonify({
                "status": state,
                "run_id": run_id,
                "result_state": result_state,
                "task_logs": logs,
                "file_path": file_path
            })

        if result_state == 'FAILED':
            return jsonify({
                "status": "FAILED",
                "run_id": run_id,
                "error_message": run_info['state'].get('state_message', 'Unknown error occurred'),
                "task_logs": logs,
                "file_path": file_path
            }), 500

        time.sleep(1)

@app.route('/workflow/remove-task', methods=['POST'])
def remove_task():
    # Load the JSON file
    json_file_path = 'C:/Users/DELL/Desktop/ang9f/frontend/src/assets/data/dummy.json'
    
    try:
        with open(json_file_path, 'r') as f:
            job_data = json.load(f)

        job_id = job_data['run_id']
        task_logs = job_data['task_logs']
        
        # Find the first failed task
        failed_task = next((task for task in task_logs if task['state']['result_state'] == 'FAILED'), None)
        
        if not failed_task:
            return jsonify({'error': 'No failed task found'}), 404

        task_key_to_remove = failed_task['task_key']

        if not job_id or not task_key_to_remove:
            return jsonify({'error': 'Job ID and task_key are required'}), 400

        try:
            url = f"{DATABRICKS_INSTANCE_URL}/api/2.1/jobs/get"
            current_config = requests.get(url, headers=headers, params={"job_id": job_id})
            current_config = current_config.json()
            tasks = current_config['settings']['tasks']

            # Remove the specified task
            updated_tasks = [task for task in tasks if task['task_key'] != task_key_to_remove]

            # Update dependencies
            for task in updated_tasks:
                if 'depends_on' in task:
                    task['depends_on'] = [dep for dep in task['depends_on'] if dep['task_key'] != task_key_to_remove]

            # Update the job configuration
            updated_config = {
                "name": current_config['settings']['name'],
                "tasks": updated_tasks,
                "email_notifications": current_config['settings'].get('email_notifications', {})
            }

            # Send the updated configuration to Databricks
            url = f"{DATABRICKS_INSTANCE_URL}/api/2.1/jobs/reset"
            update_response = requests.post(url, headers=headers, json={"job_id": job_id, "new_settings": updated_config})

            if update_response.status_code != 200:
                return jsonify({'error': update_response.json()}), update_response.status_code

            # Execute the updated job
            execute_response = execute_workflow()

            return jsonify({
                'message': 'Task removed and job triggered successfully',
                'update_response': update_response.json(),
                'execute_response': execute_response.get_json()
            })

        except Exception as e:
            return jsonify({'error': f'Internal server error: {str(e)}'}), 500

    except FileNotFoundError:
        return jsonify({'error': 'JSON file not found'}), 404
    except json.JSONDecodeError:
        return jsonify({'error': 'Error decoding JSON'}), 400
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

        
# @app.route('/workflow/retry', methods=['GET'])
# def retry():
#     # Load the JSON file
#     json_file_path = 'C:/Users/DELL/Desktop/ang9f/frontend/src/assets/data/dummy.json'
    
#     try:
#         with open(json_file_path, 'r') as f:
#             job_data = json.load(f)

#         # Extract the job ID
#         run_id = job_data['run_id']
#         task_logs = job_data['task_logs']
        
#         # Find the first failed task
#         failed_task = next((task for task in task_logs if task['state']['result_state'] == 'FAILED'), None)
        
#         if not failed_task:
#             return jsonify({'error': 'No failed task found'}), 404
        
#         job_id = run_id  # Assuming run_id is used as job_id for this example
#         task_key_to_remove = failed_task['task_key']

#         # Call the remove_task function
#         data = {'job_id': job_id, 'task_key': task_key_to_remove}
#         return remove_task(data)

#     except FileNotFoundError:
#         return jsonify({'error': 'JSON file not found'}), 404
#     except json.JSONDecodeError:
#         return jsonify({'error': 'Error decoding JSON'}), 400
#     except Exception as e:
#         return jsonify({'error': f'Internal server error: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)
