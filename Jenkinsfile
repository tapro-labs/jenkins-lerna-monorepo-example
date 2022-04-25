podTemplate(name: 'monorepo-example-template') {
    node ('monorepo-example-template'){
        def gitBranch = env.BRANCH_NAME
        def environment = "staging"

        if (gitBranch == 'main') {
            environment = "production"
        }

        def packagesChanged
        def shouldExit = false

        container('monorepo-example-builder') {
            stage('Checkout') {
                // we need to checkout the repository first, to get the package.json and install packages
                checkout scm
            }

            stage('Install Dependencies') {
                // set network timeout
                // since on slow machines downloading files into the system is slow and takes more time than a faster computer
                sh "DOCKER_BUILD=production yarn --network-timeout 600000 --cache-folder=/tmp/.local-yarn-cache"
            }

            packagesChanged = sh(
              script: 'echo $(./node_modules/.bin/lerna ls --since "$(git rev-parse HEAD~1)") | xargs printf \'%s\\n\'',
              returnStdout: true
             )
             .trim()
             .split('\n')
             // remove everything before /
             // so that we get the folder name only and not the full path
             .collect{ value -> value.replaceFirst(/@tapro-labs\//, '') }
             // skip names that are empty
             .findAll{ value -> value != '' && value != null && value != ' ' }

            // if there are no changed packages
            // we exit from the build
            if (packagesChanged.size() <= 0) {
               shouldExit = true
               return
            }

            stage('Build updated packages') {
              env.NODE_OPTIONS = '"--max-old-space-size=768"';
              sh './node_modules/.bin/lerna run build --since "$(git rev-parse HEAD~1)" --concurrency 1'
            }
        }

        if (shouldExit) {
          return
        }

        def dockerRegistry = env.PRIVATE_DOCKER_REGISTRY
        def dockerImagePrefix = env.DOCKER_IMAGE_PREFIX

        container('monorepo-example-deployer') {
            // we use deployment name if our deployment names in kubernetes do not match in our repository
            // Sometimes these names do not match
            def deployments = [
              "my-first-react-app": [
                deploymentName: "first-react-app",
                dockerImageName: "tapro-labs/first-react-app",
              ],
              "my-second-react-app": [
                deploymentName: "second-react-app",
                dockerImageName: "tapro-labs/second-react-app",
              ],
              "my-third-react-app": [
                deploymentName: "third-react-app",
                dockerImageName: "tapro-labs/third-react-app",
              ]
            ]

            packagesChanged.each { packageName ->
                stage("Building docker image for ${packageName}") {
                  def dockerImageName = deployments.get(packageName).get('dockerImageName');
                  sh "docker build -t ${dockerImagePrefix}/${dockerImageName}:${environment} -f ./packages/${packageName}/Dockerfile"
                }
            }

            stage("Push docker image") {
                withCredentials([file(credentialsId: 'monorepo-example-gcloud-credential', variable: 'GC_KEY')]) {
                    sh 'gcloud auth activate-service-account --key-file=${GC_KEY}'
                    sh 'gcloud config set project tapro-labs'
                    sh 'gcloud auth configure-docker'

                    docker.withRegistry(dockerRegistry) {
                        packagesChanged.each { packageName ->
                            def app = docker.image(dockerImagePrefix + "/" + deployments.get(packageName).get('dockerImageName') + ":" + environment)

                            // we push the image with two tags
                            // one for the production or staging tag
                            // the other one is a tag with the current docker build
                            app.push(environment)
                            app.push(env.BUILD_TAG)
                        }
                    }
                }
            }

            stage('Deploy to cluster') {
                def kubernetesServerUrl = env.KUBERNETES_SERVER_URL
                def deploymentNamespace = env.DEPLOYMENT_NAMESPACE

                withKubeConfig([credentialsId: 'monorepo-example-kubernetes-service-account', serverUrl: kubernetesServerUrl]) {
                  packagesChanged.each { packageName ->
                    def deployment = deployments.get(packageName)
                    def deploymentName = deployment.get("deploymentName")
                    def deploymentDockerImageName = deployment.get("dockerImageName")

                    sh "kubectl set image deployment/tapro-labs-${deploymentName} -n ${deploymentNamespace} ${deploymentName}=${dockerImagePrefix}/${deploymentDockerImageName}:${env.BUILD_TAG}"
                  }
                }
            }
        }
    }
}
